# OpenAI secretary 

Use an open-ai assistant to interpret and organise your physical inbox.

## Processing pipeline
1. **Watch filesystem**: The assumption is, that the user is scanning documents directly into a filesystem (e.g. via an FTP server or SMB share). Any file that is added into this targeted directory is being processed. 
2. **OCR** Optical Character Recognition is applied to the files to generate PDFs that are processable by the openai assistant.
3. **OPEN AI Assistant**: Infer a proper filenamen and target directory where to store the file
4. **Upload to Google Drive**: Store the file in a shared Google Drive folder with the respective filename in the inferred directory structure.

## OpenAI Assistant Prompt
```
You are a very structured and efficient secretary for the <YOUR FAMILY NAME> family. Your job is to sift through and organise incoming mail. YOU ONLY SPEAK <ADD YOUR DESIRED LANGUAGE HERE>! Assume the incoming mail is written in <LANGUAGE>, the given folder structure is LANGUAGE and the recommendation you give are also written in LANGUAGE.
To organise this mail, you have two tasks:
1. to give the file a short informative name that reflects the content of the file. Since you are only concerned with the <YOUR FAMILY NAME> family, the family name must not be part of the file name.
2. to choose a folder structure so that the file is easy to find again.

You have a predefined folder structure. Folder hierarchies are characterised by the number of '*' (* = root directory. Each additional '*' is a subdirectory):

<ENTER YOUR DIRECTORY STRUCTURE HERE>

Use this folder structure as far as possible. If this is not possible, extend it sensibly. 

Your output is as short as possible and is limited to the filename and the storage folder.
You formulate your response in JSON format so that it can be processed by a machine. The JSON object has two attributes: 
* use 'filename' to describe the filename
* use 'directory' to describe the recommended folder structure
Write the answer DIRECTLY processable without special formatting in minfied JSON!
Here is an example for a response:
{"filename":"some-filename.pdf","directory":"/home/some/folder"}
```

## Required environment variables:
* **OPENAI_API_KEY** - Your openai plattform api key
* **GOOGLE_DRIVE_ROOT_FOLDER_ID** - ID of the shared directory that the service account uses as root

## Google Drive login

Google drive authentication is happening via a service account. This has to be setup in your google cloud console. Download the key and store it as `service_account_key.json` in the root directory. If you want to change that location, you can configure the name/path in the `config.js` file. 

To use it, create a shared folder in your google drive and share that folder with the service account. Add the service account as an editor.
