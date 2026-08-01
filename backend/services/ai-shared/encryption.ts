import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

let warned = false;

const getEncryptionKey = (): string => {
    const key = process.env.ENCRYPTION_KEY || '';
    if ((!key || key.length !== 32) && !warned) {
        warned = true;
        console.warn("WARNING: ENCRYPTION_KEY is missing or not 32 characters. Secure storage will fail.");
    }
    return key;
};

export const encryptApiKey = (text: string): string => {
    const key = getEncryptionKey();
    if (!key) throw new Error("Server configuration error: Missing encryption key");

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
};

export const decryptApiKey = (text: string): string => {
    const key = getEncryptionKey();
    if (!key) throw new Error("Server configuration error: Missing encryption key");

    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
};
