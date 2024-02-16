import fs from "fs";
import OpenAI from "openai";
import config from "../config.js"
import { Sleep } from "./utils.js"

const openai = new OpenAI({
    apiKey : config.openai_api_key,
});

const ASSISTANT_ID = "asst_648j1djJR1kxcQmSEH4rZv4M"
const RUN_STATUS_SUCCESS = ['completed']
const RUN_STATUS_INPROGRESS = ['queued', 'in_progress']
const RUN_STATUS_FAILED = ['requires_action', 'cancelling', 'cancelled', 'failed', 'expired']

async function waitForRun(run) {
    return new Promise( async (resolve, reject) => {
        var runStatus = await openai.beta.threads.runs.retrieve(run.thread_id, run.id)
        while(true) {
            if (RUN_STATUS_FAILED.includes(runStatus.status)) { 
                console.log(`run failed: ${runStatus.status}`)
                reject(run) 
                break
            }
            if (RUN_STATUS_SUCCESS.includes(runStatus.status)) { 
                console.log(`run successful`)
                resolve(run) 
                break
            }
            if (RUN_STATUS_INPROGRESS.includes(runStatus.status)) {
                await Sleep(500) 
                console.log(`waiting for run: ${runStatus.status}`)
                runStatus = await openai.beta.threads.runs.retrieve(run.thread_id, run.id)
            }
        }
    })
}

/**
 * 
 * @param {String} inputFilename 
 */
export async function inferFileNameAndDirectory(inputFilename) {
    const filename = inputFilename.toString().trim()
    console.log(`processing file ${filename}`)
    const file = await openai.files.create({
        file: fs.createReadStream(filename),
        purpose: 'assistants'
    })
    console.log(`file uploaded: ${JSON.stringify(file)}`)
    
    await Sleep(1000) //somehow it still takes a bit of time for the assistant to be able to process the file

    const run = await openai.beta.threads.createAndRun({
        assistant_id: ASSISTANT_ID,
        thread: {
          messages: [
            { role: "user", content: "", file_ids: [ file.id ] },
          ],
        },
      });

    await waitForRun(run)

    const messagePage = await openai.beta.threads.messages.list(run.thread_id)
    const result = messagePage.data[0].content[0].text.value.replace("```json", "").replace("```", "")
    try {
        const response = JSON.parse(result)
        if (!response.directory || !response.filename) {
            console.log(`openai didn't respon correctly. Filename or directory missing! \n${result}`)
        }
        console.log(JSON.stringify(response))
        const deleteFileResponse = JSON.stringify(await openai.files.del(file.id))
        console.log(`deleted file in openai platform: ${deleteFileResponse}`)
        return response
    } catch(err) {
        console.log(`ERROR during openai assitant processing. Assistant response:\n ${result}`)
    }
    
}