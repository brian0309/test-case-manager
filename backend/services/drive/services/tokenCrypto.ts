import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Resolves the key used to encrypt Google Drive refresh tokens.
 * Prefers GOOGLE_TOKEN_ENCRYPTION_KEY, falls back to ENCRYPTION_KEY.
 */
const getTokenEncryptionKey = (): string => {
  const key = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || "";
  if (!key || key.length !== 32) {
    throw new Error(
      "Server configuration error: GOOGLE_TOKEN_ENCRYPTION_KEY (or ENCRYPTION_KEY) must be exactly 32 characters"
    );
  }
  return key;
};

export const encryptDriveToken = (text: string): string => {
  const key = getTokenEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
};

export const decryptDriveToken = (text: string): string => {
  const key = getTokenEncryptionKey();
  const textParts = text.split(":");
  const iv = Buffer.from(textParts.shift()!, "hex");
  const encryptedText = Buffer.from(textParts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};