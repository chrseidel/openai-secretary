import { createWorker, createScheduler } from "tesseract.js"
import config from "../config.js"
import os from "os"
import { PDFDocument } from "pdf-lib"
import { loadPdf, pdfPagesAsImages } from "./pdf.js"
import { writeFileSync } from "fs"
import { createTmpFileName } from "./utils.js"

const ocrScheduler = createScheduler()
for (let i = 0; i< os.cpus().length; i++) {
    console.log(`[OCR] setting up OCR worker ${i+1}`)
    ocrScheduler.addWorker(await createWorker(config.ocr_lang))
}

/**
 * 
 * @param {Array<Buffer>} imageBuffers 
 * @returns {Promise<Array<number[]>>}
 */
async function imagesToOcrPdfs(imageBuffers) {    
    const promises = imageBuffers.map((imageBuffer) => ocrScheduler.addJob("recognize", imageBuffer, {pdfTitle: "scanned doc"}, {pdf: true}))
  
    const pdfs = []
    for (let promise of promises) {
      const {data: {_, pdf}} = await promise
      pdfs.push(pdf)
    }
    return pdfs
  }

/**
 * 
 * @param {Array<number[]>} pdfs 
 * @returns {Promise<Uint8Array>}
 */
async function mergePdfs(pdfs) {
    console.log(`[OCR] merging ${pdfs.length} binary pdfs`)
    const result = await PDFDocument.create()
    for (let pdf of pdfs) {
        const d = await PDFDocument.load(Buffer.from(pdf))
        const copiedPages = await result.copyPages(d, d.getPageIndices());
        copiedPages.forEach((page) => result.addPage(page));
    }

    return await result.save()
}

/**
 * 
 * @param {string} inputPdfFilePath 
 * @returns {Promise<string>} filepath of the OCR file
 */
export async function ocrPdf(inputPdfFilePath) {

    const pdf = await loadPdf(inputPdfFilePath)
    const images = await pdfPagesAsImages(pdf)
    console.log(`[OCR] OCRing ${inputPdfFilePath}`)
    const pdfPages = await imagesToOcrPdfs(images)
    const ocrPdf = await mergePdfs(pdfPages)
    const ocrPdfFilename = createTmpFileName("pdf")
    console.log(`[OCR] storing OCR PDF to tmp file ${ocrPdfFilename}`)
    writeFileSync(ocrPdfFilename, ocrPdf)
    return ocrPdfFilename
}