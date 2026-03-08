const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const File = require("../models/File");
const FileAccess = require("../models/FileAccess");
const ActivityLog = require("../models/ActivityLog");
const { pinJSONToIPFS } = require("../services/pinata");
const { serverEncrypt, serverDecrypt } = require("../services/serverCrypto");

/**
 * GET /api/doc/ipfs/:cid
 * Proxy fetch from IPFS so the frontend avoids CORS / rate-limit issues
 * with the public Pinata gateway.
 */
router.get("/ipfs/:cid", auth, async (req, res) => {
  const { cid } = req.params;
  if (!cid || cid.length < 10) {
    return res.status(400).json({ error: "Invalid CID" });
  }

  // Try multiple gateways in order
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];

  for (const url of gateways) {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      return res.json(response.data);
    } catch (err) {
      console.warn(`IPFS gateway failed (${url}):`, err.message);
    }
  }

  res.status(502).json({ error: "Failed to fetch document from IPFS. All gateways failed." });
});

/**
 * POST /api/doc/save
 * Save editor content to IPFS and MongoDB
 * Body: { content, filename, target, encryptedKey?, aesKey? }
 * - content: already-encrypted ciphertext (if encrypted) or plain HTML
 * - encryptedKey: JSON string of wallet-encrypted AES key (for backward compat)
 * - aesKey: raw AES key (hex) — will be encrypted server-side for session-based decrypt
 */
router.post("/save", auth, async (req, res) => {
  try {
    const { content, filename, target = "cloud", encryptedKey, aesKey } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const safeName = (filename || "").trim();
    const docName = safeName || `Document-${Date.now()}`;

    // --- LOCAL SAVE ---
    if (target === "local") {
      return res.json({
        target: "local",
        filename: `${docName}.html`,
        content,
      });
    }

    // --- CLOUD SAVE ---
    const isEncrypted = !!(encryptedKey || aesKey);

    const ipfsPayload = isEncrypted
      ? {
          type: "encrypted-document",
          encryptedContent: content,
          createdAt: new Date(),
        }
      : {
          type: "document",
          content,
          createdAt: new Date(),
        };

    const cid = await pinJSONToIPFS(ipfsPayload);

    // Server-side encrypt the AES key if provided
    let srvKey = "";
    if (aesKey) {
      srvKey = serverEncrypt(aesKey);
    }

    const file = await File.create({
      filename: `${docName}.html`,
      cid,
      ownerId: req.user.id,
      encrypted: isEncrypted,
      encryptedKey: encryptedKey || "",
      serverEncryptedKey: srvKey,
    });

    await ActivityLog.create({
      fileId: file._id,
      userId: req.user.id,
      action: "SAVED_CLOUD",
      details: `Saved "${docName}" to IPFS (CID: ${cid})${isEncrypted ? " [encrypted]" : ""}`,
    });

    res.json(file);
  } catch (err) {
    console.error("❌ DOC SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save document" });
  }
});

/**
 * GET /api/doc/view/:fileId
 * Fetch + decrypt a document for the authenticated user.
 * Returns { html, filename, cid } — no MetaMask popup needed.
 */
router.get("/view/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const userEmail = (req.user.email || "").trim().toLowerCase();

    // 1. Find the file
    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    // 2. Check authorization: owner or shared-with recipient
    let serverKey = "";
    const isOwner = file.ownerId.toString() === userId;

    if (isOwner) {
      serverKey = file.serverEncryptedKey;
    } else {
      // Check if the user has access via FileAccess
      const access = await FileAccess.findOne({
        fileId: file._id,
        recipientEmail: userEmail,
      });
      if (!access) {
        return res.status(403).json({ error: "You don't have access to this file" });
      }
      serverKey = access.serverEncryptedKey;
    }

    // 3. Fetch content from IPFS
    const gateways = [
      `https://gateway.pinata.cloud/ipfs/${file.cid}`,
      `https://ipfs.io/ipfs/${file.cid}`,
      `https://cloudflare-ipfs.com/ipfs/${file.cid}`,
    ];

    let ipfsData = null;
    for (const url of gateways) {
      try {
        const resp = await axios.get(url, { timeout: 15000 });
        ipfsData = resp.data;
        break;
      } catch (err) {
        console.warn(`Gateway failed (${url}):`, err.message);
      }
    }

    if (!ipfsData) {
      return res.status(502).json({ error: "Failed to fetch from IPFS" });
    }

    // 4. If encrypted, decrypt
    if (file.encrypted && ipfsData.type === "encrypted-document" && ipfsData.encryptedContent) {
      if (!serverKey) {
        return res.status(400).json({
          error: "No server decryption key available. This file was saved before session-based decryption was enabled.",
        });
      }

      try {
        // Decrypt the AES key server-side
        const rawAesKey = serverDecrypt(serverKey);

        // Decrypt the content using the AES key (CryptoJS compatible)
        const CryptoJS = require("crypto-js");
        const bytes = CryptoJS.AES.decrypt(ipfsData.encryptedContent, rawAesKey);
        const html = bytes.toString(CryptoJS.enc.Utf8);

        if (!html) {
          return res.status(500).json({ error: "Decryption produced empty result" });
        }

        return res.json({ html, filename: file.filename, cid: file.cid, encrypted: true });
      } catch (decErr) {
        console.error("Server decryption failed:", decErr.message);
        return res.status(500).json({ error: "Failed to decrypt document" });
      }
    }

    // 5. Unencrypted document
    const html = ipfsData.content || (typeof ipfsData === "string" ? ipfsData : JSON.stringify(ipfsData));
    return res.json({ html, filename: file.filename, cid: file.cid, encrypted: false });

  } catch (err) {
    console.error("VIEW ERROR:", err);
    res.status(500).json({ error: "Failed to load document" });
  }
});

/**
 * POST /api/doc/log
 * Log a local-save or other client-side action
 * Body: { fileId?, action, details }
 */
router.post("/log", auth, async (req, res) => {
  try {
    const { fileId, action, details } = req.body;
    const log = await ActivityLog.create({
      fileId: fileId || null,
      userId: req.user.id,
      action: action || "SAVED_LOCAL",
      details: details || "",
    });
    res.json(log);
  } catch (err) {
    console.error("LOG ERROR:", err);
    res.status(500).json({ error: "Failed to log action" });
  }
});

module.exports = router;
