import { watchFilesystem, onFileAdded } from "./services/filesystemWatcher.js";
import { pdfToImage } from "./services/ocr.js"
import { inferFromImage } from "./services/openaiFilename.js";
import path from "path"
import { storePdfInGoogleDrive } from "./services/google-drive/googleDrive.js";
import config from "./config.js"
import { unlink } from "fs/promises"

async function onNewFile(filename) {
    const inputPdfFilePath = path.join(config.watchdir, filename)
    const fileAsImage = await pdfToImage(inputPdfFilePath)
    console.log(`inferring filename and directory for ${ocrFile}`)
    const aiResult = await inferFromImage(fileAsImage)

    const newFileId = await storePdfInGoogleDrive(inputPdfFilePath, aiResult.directory, aiResult.filename)
    console.log(`created google drive file: ${aiResult.directory}/${aiResult.filename} with ID ${newFileId}`)
    console.log(`deleting temporary file ${ocrFile}`)
    await unlink(ocrFile)
    if (config.delete_file_after_processing) {
        console.log(`deleting input file ${inputPdfFilePath}`)
        await unlink(inputPdfFilePath)
    }
    console.log(`processing of ${filename} done\n\n\n`)
}

async function main() {
    const promiseOnFileAdded = onFileAdded(onNewFile)
    const promiseFilesystemWatch = watchFilesystem(config.watchdir)
    await Promise.all([promiseFilesystemWatch, promiseOnFileAdded])
}

await main()