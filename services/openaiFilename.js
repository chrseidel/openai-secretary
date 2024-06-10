import { OpenAI } from "openai";
import config from "../config.js"
import { Sleep } from "./utils.js"
import { Readable } from "stream"
import { writeFileSync, createReadStream } from "fs"

const openai = new OpenAI({
    apiKey : config.openai.api_key,
});

/**
 * 
 * @param {*} response 
 * @returns 
 */
function cleanAssistantResponse(response) {
    return response.replace("```json", "").replace("```", "").replace(`\\"`, `"`)
}

/**
 * 
 * @param {Buffer} imageBuffer 
 */
export async function inferFromImage(imageBuffer) {
    //TODO: process Buffer directly as Readable. Somehow Readable.from(imageBuffer) doesn't work...
    writeFileSync('test.png', imageBuffer) 
    console.log("uploading file")
    const openAiUploadedFile = await openai.files.create({
            file: createReadStream('test.png'),
            purpose: "fine-tune"
        })

    console.log(`Uploaded file. result: ${JSON.stringify(openAiUploadedFile, null, 2)}`)

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
    
    console.log(`running assistant`)
    const run = await openai.beta.threads.runs.create(
        thread.id,
        { 
            assistant_id: config.openai.assistant_id,
            stream: true
         },
    );

    for await (const event of run) {
        console.log(event)
    }
    console.log("run should be done")
    const messagePage = await openai.beta.threads.messages.list(thread.id)
    console.log(`got back page of messages: ${JSON.stringify(messagePage, null, 2)}`)
    const result = JSON.parse(cleanAssistantResponse(messagePage.body.data[0].content[0].text.value))
    console.log(`got a result: ${JSON.stringify(result, null, 2)}`)

    console.log(`deleting file with id ${openAiUploadedFile.id}`)
    await openai.files.del(openAiUploadedFile.id)
    console.log("all done")
    return result
}
