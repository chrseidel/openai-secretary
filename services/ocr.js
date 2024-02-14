import { createWorker } from "tesseract.js";
import {promises as fs} from "fs";
import config from "../config.js";

const worker = await createWorker(config.ocr_lang);

/**
 * 
 * @param {String} directory "Directory to read file from"
 * @param {String} filename "Filename to be read"
 * @returns {String} "written file"
 */
export async function imageToOCRPdf(inputFile, outputFile) {
  console.log(`OCRing ${inputFile}`)
  const { data: { text, pdf } } = await worker.recognize(inputFile, {pdfTitle: "scanned doc"}, {pdf: true});
  await fs.writeFile(outputFile, Buffer.from(pdf));
  console.log(`output created and written to ${outputFile}`)
  await worker.terminate();

  return outputFile
};