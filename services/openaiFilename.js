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
                console.log(`[OPENAI] run failed: ${runStatus.status}`)
                reject(run) 
                break
            }
            if (RUN_STATUS_SUCCESS.includes(runStatus.status)) { 
                console.log(`[OPENAI] run successful`)
                resolve(run) 
                break
            }
            if (RUN_STATUS_INPROGRESS.includes(runStatus.status)) {
                await Sleep(500) 
                console.log(`[OPENAI] waiting for run: ${runStatus.status}`)
                runStatus = await openai.beta.threads.runs.retrieve(run.thread_id, run.id)
            }
        }
    })
}

async function processText(text) {
    const run = await openai.beta.threads.createAndRun({
        assistant_id: ASSISTANT_ID,
        thread: {
          messages: [
            { role: "user", content: text, file_ids: [] },
          ],
        },
      });

    await waitForRun(run)

    const messagePage = await openai.beta.threads.messages.list(run.thread_id)
    const result = messagePage.data[0].content[0].text.value.replace("```json", "").replace("```", "")

    try {
        const response = JSON.parse(result)
        if (!response.directory || !response.filename) {
            console.log(`[OPENAI] openai didn't respond correctly. Filename or directory missing! \n${result}`)
            return null
        }
        console.log(JSON.stringify(response))
        return response
    } catch(err) {
        console.log(`[OPENAI] ERROR during openai assitant processing. ${err} \n Assistant response:\n ${result}`)
        return null
    }
}

/**
 * 
 * @param {String} text 
 */
export async function inferFileNameAndDirectoryByPdfText(text) {  
    let attempt = 0
    while(attempt < config.retries.openai_processing) {
        const response = await processText(text)
        if (response) {
            return response
        } else {
            console.log(`[OPENAI] openai response invalid on attempt ${attempt}`)
            attempt++
        }
    }
    console.log(`[OPENAI] ERROR! OpenAi assistant was not able to process the document`)
}
