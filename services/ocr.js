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
 * Processes a list of image buffers to perform OCR, generating both PDF files with embedded text
 * and a combined string of the recognized text from all pages.
 * 
 * @param {Buffer[]} imageBuffers - An array of image buffers to be processed.
 * @returns {Promise<{pdfs: Buffer[], fullText: string}>} - A promise resolving to an object containing:
 *   - `pdfPages`: An array of PDF buffers, one for each image.
 *   - `text`: A single string with the concatenated text from all processed images.
 * 
 */
async function imagesToOcrPdfsWithText(imageBuffers) {    
    const promises = imageBuffers.map((imageBuffer) => ocrScheduler.addJob("recognize", imageBuffer, {pdfTitle: "scanned doc"}, {pdf: true}))
  
    const pdfs = []
    let fullText = '';
    for (let promise of promises) {
      const { data: { text, pdf } } = await promise
      pdfs.push(pdf)
      fullText += text + '\n'; // Add a newline between pages for better readability
    }
    return { pdfPages: pdfs, text: fullText.trim() }
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

export async function ocrPdfWithText(inputPdfFilePath) {

    const pdf = await loadPdf(inputPdfFilePath)
    const images = await pdfPagesAsImages(pdf)
    console.log(`[OCR] OCRing ${inputPdfFilePath}`)
    const { pdfPages, text } = await imagesToOcrPdfsWithText(images)
    const ocrPdf = await mergePdfs(pdfPages)
    const ocrPdfLocation = createTmpFileName("pdf")
    console.log(`[OCR] storing OCR PDF to tmp file ${ocrPdfLocation}`)
    writeFileSync(ocrPdfLocation, ocrPdf)
    return { ocrPdfLocation, text }
}