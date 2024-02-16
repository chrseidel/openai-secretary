import { watchFilesystem } from "./services/filesystemWatcher.js";
import { imageToOCRPdf } from "./services/ocr.js"
import { inferFileNameAndDirectory } from "./services/openaiFilename.js";
import path from "path"
import { storePdfInGoogleDrive } from "./services/google-drive/googleDrive.js";
import config from "./config.js"
import { fileWithPdfExtension } from "./services/utils.js"
import { unlink } from "fs/promises"

async function onNewFile(filename) {
    const inputFile = path.join(config.watchdir, filename)
    const ocrFile = path.join(config.workdir, fileWithPdfExtension(filename))
    await imageToOCRPdf(inputFile, ocrFile)
    console.log(`inferring filename and directory for ${ocrFile}`)
    const aiResult = await inferFileNameAndDirectory(ocrFile)

    const newFileId = await storePdfInGoogleDrive(ocrFile, aiResult.directory, aiResult.filename)
    console.log(`created google drive file: ${aiResult.directory}/${aiResult.filename} with ID ${newFileId}`)
    await unlink(ocrFile)
    if (config.delete_file_after_processing) await unlink(inputFile)
}

async function main() {
    await watchFilesystem(BASE_DIR, onNewFile)
}

await main()