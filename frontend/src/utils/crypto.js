/**
 * FortiDocs Encryption Utilities
 *
 * AES-256 encryption for document content.
 * NaCl (x25519-xsalsa20-poly1305) for wallet-based AES key wrapping.
 *
 * Flow:
 *  1. Generate a random AES key per document.
 *  2. Encrypt document content with AES key.
 *  3. Encrypt AES key with wallet's encryption public key (NaCl box).
 *  4. Store encrypted content + encrypted key on IPFS / MongoDB.
 *  5. Decrypt AES key via MetaMask `eth_decrypt`, then decrypt content.
 */

import CryptoJS from "crypto-js";
import nacl from "tweetnacl";
import naclUtil from "tweetnacl-util";

/* ============================================================
 * AES-256 Encryption
 * ============================================================ */

/**
 * Generate a random 256-bit AES key (returned as hex string).
 */
export function generateAESKey() {
  const key = CryptoJS.lib.WordArray.random(32); // 256 bits
  return key.toString(CryptoJS.enc.Hex);
}

/**
 * Encrypt plaintext with an AES key.
 * @param {string} plaintext - The document HTML content
 * @param {string} aesKeyHex - 256-bit key as hex string
 * @returns {string} - Base64-encoded ciphertext (includes IV + salt internally)
 */
export function encryptAES(plaintext, aesKeyHex) {
  const encrypted = CryptoJS.AES.encrypt(plaintext, aesKeyHex);
  return encrypted.toString(); // OpenSSL-compatible Base64 format
}

/**
 * Decrypt AES ciphertext back to plaintext.
 * @param {string} ciphertext - Base64-encoded string from encryptAES
 * @param {string} aesKeyHex - Same key used for encryption
 * @returns {string} - Original plaintext
 */
export function decryptAES(ciphertext, aesKeyHex) {
  const bytes = CryptoJS.AES.decrypt(ciphertext, aesKeyHex);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/* ============================================================
 * MetaMask Wallet Encryption (x25519-xsalsa20-poly1305)
 * ============================================================ */

/**
 * Get the user's encryption public key from MetaMask.
 * This key is used by others to encrypt data FOR this user.
 * @param {string} account - Ethereum address (e.g. 0xABC...)
 * @returns {Promise<string>} - Base64-encoded x25519 public key
 */
export async function getEncryptionPublicKey(account) {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const publicKey = await window.ethereum.request({
    method: "eth_getEncryptionPublicKey",
    params: [account],
  });
  return publicKey; // Base64 string
}

/**
 * Encrypt data (AES key) using a wallet's encryption public key.
 * Uses NaCl box (x25519-xsalsa20-poly1305) — same scheme MetaMask uses.
 *
 * @param {string} publicKeyBase64 - Recipient's encryption public key
 * @param {string} data - The AES key (hex string) to encrypt
 * @returns {object} - { version, nonce, ephemPublicKey, ciphertext } (all Base64)
 */
export function encryptForWallet(publicKeyBase64, data) {
  const ephemeralKeyPair = nacl.box.keyPair();
  const pubKeyUInt8 = naclUtil.decodeBase64(publicKeyBase64);
  const msgUInt8 = naclUtil.decodeUTF8(data);
  const nonce = nacl.randomBytes(nacl.box.nonceLength);

  const encryptedMessage = nacl.box(
    msgUInt8,
    nonce,
    pubKeyUInt8,
    ephemeralKeyPair.secretKey
  );

  return {
    version: "x25519-xsalsa20-poly1305",
    nonce: naclUtil.encodeBase64(nonce),
    ephemPublicKey: naclUtil.encodeBase64(ephemeralKeyPair.publicKey),
    ciphertext: naclUtil.encodeBase64(encryptedMessage),
  };
}

/**
 * Decrypt data using MetaMask's internal key via `eth_decrypt`.
 * @param {object} encryptedData - { version, nonce, ephemPublicKey, ciphertext }
 * @param {string} account - The wallet address that owns the private key
 * @returns {Promise<string>} - Decrypted string (the AES key)
 */
export async function decryptWithWallet(encryptedData, account) {
  if (!window.ethereum) throw new Error("MetaMask not found");
  const decrypted = await window.ethereum.request({
    method: "eth_decrypt",
    params: [JSON.stringify(encryptedData), account],
  });
  return decrypted;
}
