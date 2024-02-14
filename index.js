import { watchFilesystem } from "./services/filesystemWatcher.js";
import { imageToOCRPdf } from "./services/ocr.js"
import { inferFileNameAndDirectory } from "./services/openaiFilename.js";
import path from "path"
import { storePdfInGoogleDrive } from "./services/google-drive/googleDrive.js";
import config from "./config.js"

const BASE_DIR = config.watchdir
const WORK_DIR = config.workdir

/**
 * 
 * @param {String} file 
 * @returns String
 */
function fileWithPdfExtension(file) {
    const filePath = path.parse(file)
    filePath.ext = `.pdf`
    filePath.base = null
    return path.format(filePath)
  }

async function onNewFile(filename) {
    const ocrFile = await imageToOCRPdf(path.join(BASE_DIR, filename), path.join(WORK_DIR, fileWithPdfExtension(filename)))
    console.log(`inferring filename and directory for ${ocrFile}`)
    const aiResult = await inferFileNameAndDirectory(ocrFile)

    const newFileId = await storePdfInGoogleDrive(ocrFile, aiResult.directory, aiResult.filename)
    console.log(`created google drive file: ${aiResult.directory}/${aiResult.filename} with ID ${newFileId}`)
}

async function main() {
    await watchFilesystem(BASE_DIR, onNewFile)
}

await main()