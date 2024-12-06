import { watch } from "fs/promises"
import { existsSync } from "fs";
import path from "path";
import { Channel } from "queueable";
import { Sleep } from "./utils.js";

const filenameChannel = new Channel()

export async function onFileAdded(fn) {
  for await (let file of filenameChannel) {
    console.log(`[FILESYSTEM] processing ${file}`)
    await fn(file)
  }
}

export async function watchFilesystem(dir) {
  console.log(`[FILESYSTEM] watching ${dir}...`)
  try {
    //caveats of watch: https://nodejs.org/docs/latest/api/fs.html#caveats
    for await (let event of watch(dir)) {
      // console.log(JSON.stringify(event))
        if (event.eventType !== 'rename') {
          // console.log(`[FILESYSTEM] notified event of type '${event.eventType}'. Ignoring this event.`)
          continue
        }
        if (!existsSync(path.join(dir, event.filename))) {
          // console.log(`[FILESYSTEM] file ${event.filename} has been deleted.`)
          continue
        }
        if (path.parse(event.filename).ext != ".pdf") {
          // console.log(`[FILESYSTEM] ${event.filename} is not a PDF. Ignoring.`)
          continue
        }
        await Sleep(2000)
        console.log(`[FILESYSTEM] pushing ${event.filename} to buffer`)
        filenameChannel.push(path.join(dir, event.filename))
    }
  } catch (err) {
    if (err.name === 'AbortError')
      return;
    throw err;
  }
}; 