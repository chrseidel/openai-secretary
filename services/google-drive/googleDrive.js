import path from "path"
import { getDriveClient } from "./googleDriveClient.js";
import fs from "fs"
import config from "../../config.js";

const drive = await getDriveClient()

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
  console.log(`[GOOGLE DRIVE] created dir "${directoryName}" with id ${createdFolder.data.id}`)
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
  console.log(`[GOOGLE DRIVE] uploading file "${filename}" into folder "${parentDirId}"`)
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
        console.log('[GOOGLE DRIVE] new uploaded file Id:', file.data.id);
        return file.data.id;
      } catch (err) {
        console.log(`[GOOGLE DRIVE] ERROR during file upload: ${err}`)
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
  console.log(`[GOOGLE DRIVE] searching for directory "${dirName}" in directory with ID ${currentDirId}`)
  const dirList = await drive.files.list({
    q: `mimeType=\'application/vnd.google-apps.folder\' and parents in \'${currentDirId}\'`,
    fields: '*',
    spaces: 'drive',
  })

  const maybeDir = dirList.data.files.find((d) => d.name.trim().toUpperCase() === dirName.toUpperCase())
  if (maybeDir) {
    console.debug(`[GOOGLE DRIVE] found existing directory "${dirName}" with ID ${maybeDir.id}`)
    return getTargetDirectoryId(directories, maybeDir.id)
  } else {
    console.log(`[GOOGLE DRIVE] creating new directory ${dirName}`)
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
export async function storePdfInGoogleDrive(file, directory, filename) {
    const dirs = directory.split('/').map((dir) => dir.trim()).filter((dir) => dir !== "")
    console.log(`[GOOGLE DRIVE] targeting directory ${JSON.stringify(dirs)}`)
    const targetDirId = await getTargetDirectoryId(dirs, config.google_drive.root_folder_id)
    return await uploadPDF(targetDirId, filename, () => fs.createReadStream(file))
}
