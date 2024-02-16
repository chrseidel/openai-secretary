import { Readable } from "stream"
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

 /**
  * 
  * @param {Readable} readable 
  * @returns Promis<Buffer>
  */
 export function readableToBuffer(readableStream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readableStream.on('data', data => {
      if (typeof data === 'string') {
        // Convert string to Buffer assuming UTF-8 encoding
        chunks.push(Buffer.from(data, 'utf-8'));
      } else if (data instanceof Buffer) {
        chunks.push(data);
      } else {
        // Convert other data types to JSON and then to a Buffer
        const jsonData = JSON.stringify(data);
        chunks.push(Buffer.from(jsonData, 'utf-8'));
      }
    });
    readableStream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    readableStream.on('error', reject);
  });
 }

export function Sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}