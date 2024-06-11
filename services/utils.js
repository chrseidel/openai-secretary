import { randomUUID } from "crypto";
import path from "path";
import config from "../config.js";

export function Sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

/**
 * Create a random png filename based on UUIDs
 * @returns {string}
 */
export function createTmpFileName(extension) {
  return path.join(config.tmpdir, `${randomUUID()}.${extension}`)
}