import process from "process"
import path from "path"

export default {
        watchdir: "/Users/christoph.seidel/Downloads",
        workdir: "/tmp",
        openai: {
            api_key: process.env.OPENAI_API_KEY,
            assistant_id: process.env.OPENAI_ASSISTANT_ID
        },
        google_drive: {
            token_path: path.join(process.cwd(), 'token.json'),
            credentials_path: path.join(process.cwd(), 'service_account_key.json'),
            root_folder_id: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
        },
        ocr_lang: "deu",
        delete_file_after_processing: process.env.DELETE_FILE_AFTER_UPLOAD || false,
        retries: {
            openai_processing: 3,
            pdf_loading: 3,
        }
    }