import {promises as fs} from "fs";
import { google } from "googleapis";
import { OAuth2Client } from 'google-auth-library';
import config from "../../config.js"

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = config.google_drive.token_path;
const CREDENTIALS_PATH = config.google_drive.credentials_path;
process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH

  /**
   * Reads previously authorized credentials from the save file.
   *
   * @return {Promise<OAuth2Client|null>}
   */
  async function loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }
  
  /**
   * Load or request or authorization to call APIs.
   * @returns {OAuth2Client}
   */
  async function authClient() {
    let client = await loadSavedCredentialsIfExist();
    if (client) {
      return client;
    }
    try {
          client = await new google.auth.GoogleAuth({
          scopes: SCOPES,
        }).getClient();
        if (client.credentials) {
            await saveCredentials(client);
          }
        return client;
    } catch (err) {
        console.log(`[GOOGLE DRIVE AUTH] ERROR DURING AUTHENTICATION: ${err}`)
        throw err
    }
  }
  
  /**
   * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
   *
   * @param {OAuth2Client} client
   * @return {Promise<void>}
   */
  async function saveCredentials(client) {
    console.log(`[GOOGLE DRIVE AUTH] reading credentials file from ${CREDENTIALS_PATH}`)
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    const payload = JSON.stringify({
      type: 'service_account',
      client_id: content.client_id,
      client_secret: content.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  }

  export async function getDriveClient() {
    return google.drive({ version: 'v3', auth: await authClient() })
  }