import { OpenAI } from "openai";
import config from "../config.js"
import { writeFileSync, createReadStream } from "fs"
import { unlink } from "fs/promises"
import { createTmpFileName } from "./utils.js";

const openai = new OpenAI({
    apiKey : config.openai.api_key,
});

/**
 * 
 * @param {*} response 
 * @returns {string}
 */
function cleanAssistantResponse(response) {
    return response.replace("```json", "").replace("```", "").replace(`\\"`, `"`)
}

/**
 * 
 * @param {Buffer} imageBuffer 
 */
export async function inferFromImage(imageBuffer) {
    
    //TODO: process Buffer directly as Readable. Somehow ReadStream.from(imageBuffer) doesn't work...
    const TMPFILE = createTmpFileName("png")
    writeFileSync(TMPFILE, imageBuffer) 
    console.log("[OPENAI] uploading file")
    const openAiUploadedFile = await openai.files.create({
            file: createReadStream(TMPFILE),
            purpose: "fine-tune"
        })

    await unlink(TMPFILE)
    console.debug(`[OPENAI] Uploaded file. result: ${JSON.stringify(openAiUploadedFile, null, 2)}`)

    const thread = await openai.beta.threads.create({
        messages: [
          {
            "role": "user",
            "content": [
                {
                    "type": "image_file",
                    "image_file": {
                        "file_id": openAiUploadedFile.id,
                        "detail": "high"
                    }
                }
            ]
          }
        ]
      });
    
    console.log(`[OPENAI] running assistant`)
    const run = await openai.beta.threads.runs.create(
        thread.id,
        { 
            assistant_id: config.openai.assistant_id,
            stream: true
         },
    );

    for await (const event of run) {
        console.log(event.event)
    }
    console.log("[OPENAI] run should be done")
    const messagePage = await openai.beta.threads.messages.list(thread.id)
    const result = JSON.parse(cleanAssistantResponse(messagePage.body.data[0].content[0].text.value))
    console.log(`[OPENAI] got a result: ${JSON.stringify(result, null, 2)}`)

    console.log(`[OPENAI] deleting file with id ${openAiUploadedFile.id}`)
    await openai.files.del(openAiUploadedFile.id)
    console.log("[OPENAI] all done")
    return result
}
