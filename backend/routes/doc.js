const express = require("express");
const router = express.Router();
const axios = require("axios");
const auth = require("../middleware/auth");
const File = require("../models/File");
const ActivityLog = require("../models/ActivityLog");
const { pinJSONToIPFS } = require("../services/pinata");

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
 * Body: { content, filename, target: "cloud" | "local", encryptedKey? }
 * - content: already-encrypted ciphertext (if encrypted) or plain HTML
 * - encryptedKey: JSON string of wallet-encrypted AES key (for cloud saves)
 */
router.post("/save", auth, async (req, res) => {
  try {
    const { content, filename, target = "cloud", encryptedKey } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const safeName = (filename || "").trim();
    const docName = safeName || `Document-${Date.now()}`;

    // --- LOCAL SAVE (no IPFS, just return content for client-side download) ---
    if (target === "local") {
      return res.json({
        target: "local",
        filename: `${docName}.html`,
        content,
      });
    }

    // --- CLOUD SAVE (upload to IPFS + persist in MongoDB) ---
    const isEncrypted = !!encryptedKey;

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

    const file = await File.create({
      filename: `${docName}.html`,
      cid,
      ownerId: req.user.id,
      encrypted: isEncrypted,
      encryptedKey: encryptedKey || "",
    });

    // Log the activity
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
