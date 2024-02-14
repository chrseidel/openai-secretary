import path from "path"
import { getDriveClient } from "./googleDriveClient.js";
import fs from "fs"
import config from "../../config.js";

const drive = await getDriveClient()

const ROOT_FOLDER_ID = config.google_drive.root_folder_id

/**
 * 
 * @param {Stting} parentFolderId 
 * @param {String} directoryName 
 * @returns String
 */
async function createDirectory(parentFolderId, directoryName) {
  const createdFolder = await drive.files.create({
    requestBody: {
      name: directoryName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId],
    }
  })
  console.log(`created dir with id ${createdFolder.data.id}`)
  return createdFolder.data.id;    
}

/**
 * 
 * @param {Array<String>} parentDirIds 
 * @param {String} filename 
 * @param {Function} readFile 
 * @returns String
 */
async function uploadPDF(parentDirId, filename, readFile) {
  console.log(`uploading file ${filename} into folder ${parentDirId}`)
      try {
        const file = await drive.files.create({
          requestBody: {
            name: filename,
            parents: [parentDirId],
          },
          media: {
            mimeType: 'application/pdf',
            body: readFile(),
          },
        });
        console.log('File Id:', file.data.id);
        return file.data.id;
      } catch (err) {
        console.log(`ERROR during file upload: ${err}`)
        throw err;
      }
}

/**
 * 
 * @param {Array<string>} directories 
 * @param {string} currentDirId 
 */
async function getTargetDirectoryId(directories, currentDirId) {
  if (directories.length == 0) return currentDirId
  const dirName = directories.shift()
  const dirList = await drive.files.list({
    q: `mimeType=\'application/vnd.google-apps.folder\' and parents in \'${currentDirId}\'`,
    fields: '*',
    spaces: 'drive',
  })
  const maybeDir = dirList.data.files.find((d) => d.name == dirName)
  if (maybeDir) {
    console.log(`found existing directory ${dirName}`)
    return getTargetDirectoryId(directories, maybeDir.id)
  } else {
    console.log(`creating new directory ${dirName}`)
    const newDirId = await createDirectory(currentDirId, dirName)
    return getTargetDirectoryId(directories, newDirId)
  }
}

/**
 * 
 * @param {String} file 
 * @param {String} targetDirs
 * @param {String} targetFilename 
 */
export async function storePdfInGoogleDrive(file, targetDirs, targetFilename) {
    const dirs = targetDirs.split(path.sep).filter((dir) => dir !== "")
    console.log(`targeting directory ${JSON.stringify(dirs)}`)
    const targetDirId = await getTargetDirectoryId(dirs, ROOT_FOLDER_ID)
    const newFileId = await uploadPDF(targetDirId, targetFilename, () => fs.createReadStream(file))
}