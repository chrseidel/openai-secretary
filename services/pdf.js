import config from "../config.js";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from 'canvas';
import { Sleep } from "./utils.js";

/**
 * 
 * @param {string} pdfFilePath 
 * @returns {PDFDocumentProxy}
 */
export async function loadPdf(pdfFilePath) {
  let attempt = 0
  while (attempt < config.retries.pdf_loading) {
    try {
      console.log(`[PDF] loading PDF document from ${pdfFilePath}`)
      return await pdfjs.getDocument(pdfFilePath).promise
    } catch(err) {
      attempt++
      console.log(`[PDF] error during loading of PDF: ${err}. ${(attempt == config.retries.pdf_loading) ? "FAILED" : "retrying..."}`)
      await Sleep(1000) //ms
    }
  }
  throw(`[PDF] Failed to load PDF data from ${pdfFilePath} after attempt number ${attempt}`)
}

/**
 * 
 * @param {PDFPageProxy} page 
 * @returns Buffer
 */
async function pdfPageAsImage(page) {
  const viewport = page.getViewport({scale: 2.0})
  const canvas = createCanvas(viewport.width, viewport.height)
  const ctx = canvas.getContext('2d')

  await page.render({
    canvasContext: ctx,
    viewport: viewport,
  }).promise

  return canvas.toBuffer()
}

/**
 * 
 * @param {PDFDocumentProxy} pdfDoc 
 */
export async function pdfPagesAsImages(pdfDoc) {

  console.log(`[PDF] Loading PDF document successfull.`)
  let pages = []
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    console.log(`[PDF] processing page ${i}`)
    const page = await pdfDoc.getPage(i)
    console.log(`[PDF] loading of page ${i} done`)
    pages.push(await pdfPageAsImage(page))
  }

  return pages
}

/**
 * 
 * @param {String} inputFilePath 
 * @returns {Buffer}
 */
export async function pdfToImage(inputFilePath) {
  const pdfDoc = await loadPdf(inputFilePath)

  console.log(`[PDF] Loading PDF document successfull.`)
  let resultCanvas = null
  let resultCtx = null

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    console.log(`[PDF] processing page ${i}`)
    const page = await pdfDoc.getPage(i)
    console.log(`[PDF] loading of page ${i} done`)
    const viewport = page.getViewport({scale: 2.0})
    if (resultCanvas == null) {
      const width = viewport.width
      const height = viewport.height * pdfDoc.numPages
      console.log(`[PDF] initialising result canvas. width: ${width}, heigth: ${height}`)
      resultCanvas = createCanvas(width, height)
      resultCtx = resultCanvas.getContext('2d')
    }
    console.log(`[PDF] rendering page into canvas`)
    await page.render({
      canvasContext: resultCtx,
      viewport: viewport,
    }).promise
  
  }

  return resultCanvas.toBuffer()
}
