// import { createWorker, createScheduler } from "tesseract.js";
import config from "../config.js";
import pdfjs from "pdfjs-dist"
// import { PDFDocument } from "pdf-lib";
import { createCanvas } from "@napi-rs/canvas";
import { readableToBuffer } from "./utils.js";
// import os from "os";
import { Sleep } from "./utils.js"
// import { stdout } from "process"
import images from "images"

/**
 * 
 * @param {PDFDocumentProxy} pdfDoc 
 * @param {number} pageNum 
 * @param {function()=> any} onDone 
 * @returns {Buffer}
 */
async function pdfPageToImage(pdfDoc, pageNum, onDone) {
  const page = await pdfDoc.page(pageNum)
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
 * @param {string} pdfFilePath 
 * @returns {PDFDocumentProxy}
 */
async function loadPdf(pdfFilePath) {
  let attempt = 0
  while (attempt < config.retries.pdf_loading) {
    try {
      console.log(`loading document from ${pdfFilePath}`)
      return await pdfjs.getDocument(pdfFilePath).promise
    } catch(err) {
      attempt++
      console.log(`[OCR] error during loading of PDF: ${err}. ${(attempt == config.retries.pdf_loading) ? "FAILED" : "retrying..."}`)
      await Sleep(500)
    }
  }
  throw(`[OCR] Failed to load PDF data from ${pdfFilePath} after attempt number ${attempt}`)
}

// /**
//  * 
//  * @param {String} pdfFile 
//  * @returns Array<Buffer>
//  */
// async function pdfToImages(pdfFile) {
//   const pdfDoc = await loadPdf(pdfFile)

//   var pagesDone = 0
//   const promises = []
//   for (let i = 1; i <= pdfDoc.numPages; i++) {
//     promises.push(pdfPageToImage(pdfDoc, i, () => pagesDone++))
//   }

//   await new Promise(async (resolve, reject) => {
//     while(pagesDone < promises.length) {
//       await Sleep(100)
//       const percentage = Math.ceil(100*pagesDone/promises.length)
//       if (stdout.isTTY) {
//         stdout.clearLine(0)
//         stdout.cursorTo(0)
//         stdout.write(`[OCR] Rendering pages as images for OCR: ${percentage}%`)
//       } else {
//         console.log(`[OCR] Rendering pages as images for OCR: ${percentage}%`)
//       }
//     }
//     console.log(" done")
//     resolve()
//   })

//   const pageImages = []
//   for (let promise of promises) {
//     pageImages.push(await promise)
//   }
//   return pageImages
// }

// /**
//  * 
//  * @param {Array<number[]>} pdfs 
//  * @returns {Uint8Array}
//  */
// async function mergePdfs(pdfs) {
//   console.debug(`[OCR] merging ${pdfs.length} binary pdfs`)
//   const result = await PDFDocument.create()
//   for (let pdf of pdfs) {
//     const d = await PDFDocument.load(Buffer.from(pdf))
//     const copiedPages = await result.copyPages(d, d.getPageIndices());
//     copiedPages.forEach((page) => result.addPage(page));
//   }
  
//   return await result.save()
// }

// const ocrScheduler = createScheduler()
  
// for (let i = 0; i< os.cpus().length; i++) {
//   console.log(`[OCR] setting up OCR worker ${i+1}`)
//   ocrScheduler.addWorker(await createWorker(config.ocr_lang))
// }

// async function ocrPdfAsync(imageBuffers) {
//   const promises = imageBuffers.map((imageBuffer) => ocrScheduler.addJob("recognize", imageBuffer, {pdfTitle: "scanned doc"}, {pdf: true}))

//   const pdfs = []
//   const texts = []
//   for (let promise of promises) {
//     const {data: {text, pdf}} = await promise
//     pdfs.push(pdf)
//     texts.push(text)
//   }
//   return {pdfs, texts}
// }

// /**
//  * 
//  * @param {String} inputFile "fully qualified path with filename to be read"
//  * @param {String} outputFile "fully qualified path with filename to be written"
//  * @returns {String} "recognized text"
//  */
// export async function createOcrPdf(inputFile, outputFile) {
//   console.log(`[OCR] extracting PDF pages as images from ${inputFile}`)
//   const imageBuffers = await pdfToImages(inputFile)

  // const {pdfs, texts} = await ocrPdfAsync(imageBuffers)
  
  // const mergedPdf = await mergePdfs(pdfs)
  // console.log(`storing merged pdf here: ${outputFile}`)
  // await fs.writeFile(outputFile, Buffer.from(mergedPdf))
  // return texts.join()
// };

/**
 * 
 * @param {String} inputFilePath 
 * @returns {Buffer}
 */
export async function pdfToImage(inputFilePath) {
  const pdfDoc = await loadPdf(inputFilePath)

  let resultCanvas = null
  let offsetY = 0

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({scale: 1.5})
    if (resultCanvas == null) {
      resultCanvas = images(viewport.width, viewport.height * pdfDoc.numPages)
    }
    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise
    
    const pageImage = images(canvas.toBuffer)

    resultCanvas.draw(pageImage, 0, offsetY)
    offsetY = offsetY + pageImage.height()
  }

  return resultCanvas.toBuffer()
}
