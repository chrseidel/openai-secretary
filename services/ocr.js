import { createWorker } from "tesseract.js";
import {promises as fs} from "fs";
import config from "../config.js";
import { getDocument } from "pdfjs-dist"
import { PDFDocument } from "pdf-lib";
import { createCanvas } from "canvas";
import { fileWithPdfExtension } from "./fileUtils.js"

/**
 * 
 * @param {String} pdfFile 
 * @returns Array<String>
 */
async function pdfToImages(pdfFile) {
  const pdfDoc = await getDocument(pdfFile).promise
  
  const fileLocations = []
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i)
    const viewport = page.getViewport({scale: 1.5})
    const canvas = createCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    await page.render({
      canvasContext: ctx,
      viewport: viewport,
    }).promise
    const filename = `/tmp/page${i}.png`
    await fs.writeFile(filename, canvas.createPNGStream())
    fileLocations.push(filename)
  }
  return fileLocations
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

/**
 * 
 * @param {String} inputFile "fully qualified path with filename to be read"
 * @param {String} outputFile "fully qualified path with filename to be written"
 * @returns {String} "written file"
 */
export async function imageToOCRPdf(inputFile, outputFile) {
  console.log(`extracting PDF pages as images from ${inputFile}`)
  const imagePageLocations = await pdfToImages(inputFile)
  console.log(`creating worker with language ${config.ocr_lang}`)

  const promises = imagePageLocations.map((imageLocation) => new Promise(async (resolve, reject) => {
      const worker = await createWorker(config.ocr_lang);
      console.log(`OCRing ${imageLocation}`)
      const { data: { _, pdf } } = await worker.recognize(imageLocation, {pdfTitle: "scanned doc"}, {pdf: true});
      await worker.terminate();
      await fs.unlink(imageLocation)
      resolve(pdf)
  })) 

  const pdfs = []
  for (let promise of promises) {
    pdfs.push(await promise)
  }
  const mergedPdf = await mergePdfs(pdfs)
  console.log(`storing merged pdf here: ${outputFile}`)
  await fs.writeFile(outputFile, Buffer.from(mergedPdf))

  return outputFile
};

(await async function test() {
  await imageToOCRPdf("/tmp/multipage.pdf", "/tmp/multipage_ocr.pdf")
  // await pdfToCanvas('/tmp/multipage.pdf')
})()