import { watch } from "fs/promises"
import { existsSync } from "fs";
import path from "path";

export async function watchFilesystem(dir, onFileAdded) {
  console.log(`watching ${dir}...`)
  try {
    //caveats of watch: https://nodejs.org/docs/latest/api/fs.html#caveats
    const watcher = watch(dir);
    for await (const event of watcher) {
      console.log(JSON.stringify(event))
        if (event.eventType !== 'rename') {
          console.log(`notified event of type ${event.eventType}. Ignoring this event.`)
          continue
        }
        if (!existsSync(path.join(dir, event.filename))) {
          console.log(`file ${event.filename} has been deleted.`)
          continue
        }
        if (path.parse(event.filename).ext != ".pdf") {
          console.log(`${event.filename} is not a PDF. Ignoring.`)
          continue
        }
        await onFileAdded(event.filename)
    }
  } catch (err) {
    if (err.name === 'AbortError')
      return;
    throw err;
  }
}; 