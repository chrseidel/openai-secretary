import { watch } from "fs/promises"

export async function watchFilesystem(dir, onFileAdded) {
  console.log(`watching ${dir}...`)
  try {
    const watcher = watch(dir);
    for await (const event of watcher) {
      console.log(JSON.stringify(event))
        if (event.eventType !== 'rename') {
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