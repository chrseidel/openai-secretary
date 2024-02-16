import { createWorker, createScheduler } from "tesseract.js";
import {promises as fs} from "fs";
import config from "../config.js";
import { getDocument } from "pdfjs-dist"
import { PDFDocument } from "pdf-lib";
import { createCanvas } from "canvas";
import { readableToBuffer } from "./utils.js";
import os from "os";
import { Sleep } from "./utils.js"
import { stdout } from "process"

/**
 * 
 * @param {PDFDocument} pdfDoc 
 * @param {number} pageNum 
 * @param {function()=> any} onDone 
 * @returns 
 */
async function pdfPageToImage(pdfDoc, pageNum, onDone) {
  const page = await pdfDoc.getPage(pageNum)
  const viewport = page.getViewport({scale: 1.5})
  const canvas = createCanvas(viewport.width, viewport.height)
  const ctx = canvas.getContext('2d')
  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise
  const readable = canvas.createPNGStream()
  const imageBuffer = await readableToBuffer(readable)
  onDone()
  return imageBuffer
}

/**
 * 
 * @param {String} pdfFile 
 * @returns Array<Buffer>
 */
async function pdfToImages(pdfFile) {
  const pdfDoc = await getDocument(pdfFile).promise

  var pagesDone = 0
  const promises = []
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    promises.push(pdfPageToImage(pdfDoc, i, () => pagesDone++))
  }

  await new Promise(async (resolve, reject) => {
    while(pagesDone < promises.length) {
      const percentage = Math.ceil(100*pagesDone/promises.length)
      if (stdout.isTTY) {
        stdout.clearLine(0)
        stdout.cursorTo(0)
        stdout.write(`Rendering pages as images for OCR: ${percentage}%`)
      } else {
        console.log(`Rendering pages as images for OCR: ${percentage}%`)
      }
      await Sleep(100)
    }
    console.log(" done")
    resolve()
  })

  const pageImages = []
  for (let promise of promises) {
    pageImages.push(await promise)
  }
  return pageImages
}

/**
 * 
 * @param {Array<number[]>} pdfs 
 * @returns {Uint8Array}
 */
async function mergePdfs(pdfs) {
  console.log(`merging ${pdfs.length} binary pdfs`)
  const result = await PDFDocument.create()
  for (let pdf of pdfs) {
    const d = await PDFDocument.load(Buffer.from(pdf))
    const copiedPages = await result.copyPages(d, d.getPageIndices());
    copiedPages.forEach((page) => result.addPage(page));
  }
  
  return await result.save()
}

async function ocrPdfAsync(imageBuffers) {
  const ocrScheduler = createScheduler()

  for (let i = 0; i< os.cpus().length; i++) {
    console.log(`setting up OCR worker ${i+1}`)
    ocrScheduler.addWorker(await createWorker(config.ocr_lang))
  }
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
 * @param {String} inputFile "fully qualified path with filename to be read"
 * @param {String} outputFile "fully qualified path with filename to be written"
 * @returns {String} "written file"
 */
export async function imageToOCRPdf(inputFile, outputFile) {
  console.log(`extracting PDF pages as images from ${inputFile}`)
  const imageBuffers = await pdfToImages(inputFile)

  const pdfs = await ocrPdfAsync(imageBuffers)
  
  const mergedPdf = await mergePdfs(pdfs)
  console.log(`storing merged pdf here: ${outputFile}`)
  await fs.writeFile(outputFile, Buffer.from(mergedPdf))

  return outputFile
};
