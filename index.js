import { watchFilesystem, onFileAdded } from "./services/filesystemWatcher.js";
import { pdfToImage } from "./services/pdf.js"
import { inferFromImage } from "./services/openaiFilename.js";
import { storePdfInGoogleDrive } from "./services/google-drive/googleDrive.js";
import config from "./config.js"
import { unlink } from "fs/promises"

async function onNewFile(inputPdfFilePath) {
    const fileAsImage = await pdfToImage(inputPdfFilePath)
    console.log(`[SECRETARY] inferring filename and directory for document`)
    const aiResult = await inferFromImage(fileAsImage)

    const newFileId = await storePdfInGoogleDrive(inputPdfFilePath, aiResult.directory, aiResult.filename)
    console.log(`[SECRETARY] created google drive file: ${aiResult.directory}/${aiResult.filename} with ID ${newFileId}`)
    if (config.delete_file_after_processing) {
        console.log(`deleting input file ${inputPdfFilePath}`)
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