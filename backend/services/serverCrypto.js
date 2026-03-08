/**
 * Server-side AES key encryption/decryption.
 *
 * Encrypts the per-document AES key with a server secret so the backend
 * can decrypt it for authenticated users without requiring MetaMask popup.
 *
 * Uses AES-256-GCM with a key derived from JWT_SECRET via PBKDF2.
 */

const crypto = require("crypto");

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT = "fortidocs-server-key-v1"; // static salt — secret comes from JWT_SECRET

/**
 * Derive a 256-bit key from the JWT secret via PBKDF2.
 */
function deriveKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not set");
  return crypto.pbkdf2Sync(secret, SALT, 100000, 32, "sha256");
}

/**
 * Encrypt a plaintext string (the AES key) with the server secret.
 * @param {string} plaintext - The raw AES key (hex string)
 * @returns {string} - iv:tag:ciphertext (all hex-encoded)
 */
function serverEncrypt(plaintext) {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${tag}:${encrypted}`;
}

/**
 * Decrypt a server-encrypted string back to the original AES key.
 * @param {string} encryptedStr - iv:tag:ciphertext (hex-encoded)
 * @returns {string} - The original plaintext (AES key hex string)
 */
function serverDecrypt(encryptedStr) {
  const parts = encryptedStr.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted key format");

  const [ivHex, tagHex, cipherHex] = parts;
  const key = deriveKey();
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(cipherHex, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

module.exports = { serverEncrypt, serverDecrypt };
