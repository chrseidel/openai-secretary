import path from "path"

/**
* 
* @param {String} file 
* @returns String
*/
export function fileWithPdfExtension(file) {
   const filePath = path.parse(file)
   filePath.ext = `.pdf`
   filePath.base = null
   return path.format(filePath)
 }