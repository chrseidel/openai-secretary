import { watchFilesystem, onFileAdded } from "./services/filesystemWatcher.js";
import { createOcrPdf } from "./services/ocr.js"
import { inferFileNameAndDirectoryByPdfText } from "./services/openaiFilename.js";
import path from "path"
import { storePdfInGoogleDrive } from "./services/google-drive/googleDrive.js";
import config from "./config.js"
import { fileWithPdfExtension } from "./services/utils.js"
import { unlink } from "fs/promises"

async function onNewFile(filename) {
    const inputFile = path.join(config.watchdir, filename)
    const ocrFile = path.join(config.workdir, fileWithPdfExtension(filename))
    const text = await createOcrPdf(inputFile, ocrFile)
    console.log(`inferring filename and directory for ${ocrFile}`)
    const aiResult = await inferFileNameAndDirectoryByPdfText(text)

    const newFileId = await storePdfInGoogleDrive(ocrFile, aiResult.directory, aiResult.filename)
    console.log(`created google drive file: ${aiResult.directory}/${aiResult.filename} with ID ${newFileId}`)
    console.log(`deleting temporary file ${ocrFile}`)
    await unlink(ocrFile)
    if (config.delete_file_after_processing) {
        console.log(`deleting input file ${inputFile}`)
        await unlink(inputFile)
    }
    console.log(`processing of ${filename} done\n\n\n`)
}

async function main() {
    const promiseOnFileAdded = onFileAdded(onNewFile)
    const promiseFilesystemWatch = watchFilesystem(config.watchdir)
    await Promise.all([promiseFilesystemWatch, promiseOnFileAdded])
}

await main()