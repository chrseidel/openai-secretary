import process from "process"
import path from "path"

export default {
        watchdir: "/Users/christoph.seidel/Downloads",
        workdir: "/tmp",
        openai_api_key: process.env.OPENAI_API_KEY,
        google_drive: {
            token_path: path.join(process.cwd(), 'token.json'),
            credentials_path: path.join(process.cwd(), 'service_account_key.json'),
            root_folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
        },
        ocr_lang: "deu"
    }