import { watchFilesystem, onFileAdded } from "./services/filesystemWatcher.js";
import { pdfToImage } from "./services/pdf.js"
import { inferFromImage } from "./services/openaiFilename.js";
import { storePdfInGoogleDrive } from "./services/google-drive/googleDrive.js";
import config from "./config.js"
import { unlink } from "fs/promises"
import { ocrPdf } from "./services/ocr.js";

async function onNewFile(inputPdfFilePath) {
    const fileAsImage = await pdfToImage(inputPdfFilePath)
    const eventualOcrPdfLocation = ocrPdf(inputPdfFilePath)
    console.log(`[SECRETARY] inferring filename and directory for document`)
    const aiResult = await inferFromImage(fileAsImage)

    const ocrPdfLocation = await eventualOcrPdfLocation

    const newFileId = await storePdfInGoogleDrive(ocrPdfLocation, aiResult.directory, aiResult.filename)
    console.log(`[SECRETARY] created google drive file: ${aiResult.directory}/${aiResult.filename} with ID ${newFileId}`)
    console.log(`[SECRETARY] deleting temporary OCR pdf file ${ocrPdfLocation}`)
    await unlink(ocrPdfLocation)
    if (config.delete_file_after_processing) {
        console.log(`[SECRETARY] deleting input file ${inputPdfFilePath}`)
        await unlink(inputPdfFilePath)
    }
    console.log(`[SECRETARY] processing of ${inputPdfFilePath} done\n\n\n`)
}

async function main() {
    const promiseOnFileAdded = onFileAdded(onNewFile)
    const promiseFilesystemWatch = watchFilesystem(config.watchdir)
    await Promise.all([promiseFilesystemWatch, promiseOnFileAdded])
}

await main()