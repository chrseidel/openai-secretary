import config from "../config.js";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.min.mjs";
import { createCanvas } from 'canvas';
import { Sleep } from "./utils.js";

/**
 * 
 * @param {string} pdfFilePath 
 * @returns {PDFDocumentProxy}
 */
async function loadPdf(pdfFilePath) {
  let attempt = 0
  while (attempt < config.retries.pdf_loading) {
    try {
      console.log(`loading PDF document from ${pdfFilePath}`)
      return await pdfjs.getDocument(pdfFilePath).promise
    } catch(err) {
      attempt++
      console.log(`[OCR] error during loading of PDF: ${err}. ${(attempt == config.retries.pdf_loading) ? "FAILED" : "retrying..."}`)
      await Sleep(500)
    }
  }
  throw(`[OCR] Failed to load PDF data from ${pdfFilePath} after attempt number ${attempt}`)
}

/**
 * 
 * @param {String} inputFilePath 
 * @returns {Buffer}
 */
export async function pdfToImage(inputFilePath) {
  const pdfDoc = await loadPdf(inputFilePath)

  console.log(`Loading PDF document successfull.`)
  let resultCanvas = null
  let resultCtx = null

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    console.log(`processing page ${i}`)
    const page = await pdfDoc.getPage(i)
    console.log(`loading of page ${i} done`)
    const viewport = page.getViewport({scale: 1.5})
    if (resultCanvas == null) {
      const width = viewport.width
      const height = viewport.height * pdfDoc.numPages
      console.log(`initialising result canvas. width: ${width}, heigth: ${height}`)
      resultCanvas = createCanvas(width, height)
      resultCtx = resultCanvas.getContext('2d')
    }
    console.log(`rendering page into canvas`)
    await page.render({
      canvasContext: resultCtx,
      viewport: viewport,
    }).promise
  
  }

  return resultCanvas.toBuffer()
}
