import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
    const key = process.env["ENCRYPTION_KEY"];
    if (!key) {
        throw new Error("ENCRYPTION_KEY environment variable is required for API key encryption");
    }
    // Derive a 32-byte key from the env var using a strong KDF (scrypt)
    return crypto.scryptSync(key, Buffer.from("ebizmate-strong-salt"), 32);
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a combined string: iv:authTag:ciphertext (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a string encrypted by encrypt().
 * Expects format: iv:authTag:ciphertext (all hex-encoded).
 */
export function decrypt(encryptedText: string): string {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, ciphertext] = encryptedText.split(":");

    if (!ivHex || !authTagHex || !ciphertext) {
        throw new Error("Invalid encrypted text format");
    }

    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
}

/**
 * Masks an API key for display in the UI.
 * Shows only the last 4 characters.
 */
export function maskApiKey(key: string | null): string {
    if (!key || key.length < 8) return "••••••••";
    return `••••••••${key.slice(-4)}`;
}
