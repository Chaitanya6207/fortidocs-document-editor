const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const axios = require("axios");
const CryptoJS = require("crypto-js");
const auth = require("../middleware/auth");
const File = require("../models/File");
const FileAccess = require("../models/FileAccess");
const DocumentVersion = require("../models/DocumentVersion");
const ActivityLog = require("../models/ActivityLog");
const User = require("../models/User");
const { pinJSONToIPFS } = require("../services/pinata");
const { serverEncrypt, serverDecrypt } = require("../services/serverCrypto");
const { logVersionOnChain } = require("../services/chain");

/**
 * Helper: generate a new random AES-256 key (hex).
 */
function generateAESKey() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Helper: compute SHA-256 hash of content for blockchain audit.
 */
function hashContent(content) {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Helper: build encryptedKeys array for all users in the ACL.
 * Encrypts the given AES key server-side for each user.
 */
async function buildEncryptedKeysForACL(file, newAesKey) {
  const ownerEmail = await User.findById(file.ownerId).then(u => (u?.email || "").trim().toLowerCase());
  const emails = new Set();
  if (ownerEmail) emails.add(ownerEmail);
  (file.accessList || []).forEach(e => emails.add(e.trim().toLowerCase()));

  const encryptedKeys = [];
  for (const email of emails) {
    const user = await User.findOne({ email });
    if (!user) continue;
    const srvKey = serverEncrypt(newAesKey);
    encryptedKeys.push({
      userId: user._id,
      email,
      serverEncryptedKey: srvKey,
    });
  }
  return encryptedKeys;
}

/**
 * Helper: strip HTML tags to get plain text for comparison.
 */
function stripHtml(html) {
  return (html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Helper: compute a simple change summary between old and new plain text.
 * Returns { addedWords, removedWords, addedLines, removedLines, changePercent, summary }
 */
function computeChangeSummary(oldHtml, newHtml) {
  const oldText = stripHtml(oldHtml);
  const newText = stripHtml(newHtml);

  const oldWords = oldText.split(/\s+/).filter(Boolean);
  const newWords = newText.split(/\s+/).filter(Boolean);

  const oldLines = oldText.split(/[.!?\n]+/).filter(l => l.trim());
  const newLines = newText.split(/[.!?\n]+/).filter(l => l.trim());

  // Simple word-level diff using Set comparison
  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  const addedWords = newWords.filter(w => !oldSet.has(w)).length;
  const removedWords = oldWords.filter(w => !newSet.has(w)).length;

  const totalWords = Math.max(oldWords.length, newWords.length, 1);
  const changePercent = Math.round(((addedWords + removedWords) / totalWords) * 100);

  const summary = [];
  if (addedWords > 0) summary.push(`+${addedWords} words added`);
  if (removedWords > 0) summary.push(`-${removedWords} words removed`);
  if (newWords.length !== oldWords.length) {
    summary.push(`Word count: ${oldWords.length} → ${newWords.length}`);
  }
  if (newLines.length !== oldLines.length) {
    summary.push(`Sentences: ${oldLines.length} → ${newLines.length}`);
  }
  summary.push(`~${changePercent}% changed`);

  return {
    addedWords,
    removedWords,
    oldWordCount: oldWords.length,
    newWordCount: newWords.length,
    oldSentenceCount: oldLines.length,
    newSentenceCount: newLines.length,
    changePercent,
    summary: summary.join(" | "),
  };
}

/**
 * Helper: fetch content from IPFS, trying multiple gateways.
 */
async function fetchFromIPFS(cid) {
  const gateways = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
    `https://cloudflare-ipfs.com/ipfs/${cid}`,
  ];
  for (const url of gateways) {
    try {
      const resp = await axios.get(url, { timeout: 15000 });
      return resp.data;
    } catch (err) {
      console.warn(`Gateway failed (${url}):`, err.message);
    }
  }
  return null;
}

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

    // --- CLOUD SAVE (Version 1) ---
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

    // Get owner info
    const owner = await User.findById(req.user.id);
    const ownerEmail = (owner?.email || "").trim().toLowerCase();

    const file = await File.create({
      filename: `${docName}.html`,
      cid,
      ownerId: req.user.id,
      ownerWallet: owner?.walletAddress || "",
      encrypted: isEncrypted,
      encryptedKey: encryptedKey || "",
      serverEncryptedKey: srvKey,
      currentVersion: 1,
      accessList: [ownerEmail],
    });

    // Create Version 1 record
    const fileHash = hashContent(content);
    const encryptedKeys = [];
    if (aesKey && owner) {
      encryptedKeys.push({
        userId: owner._id,
        email: ownerEmail,
        serverEncryptedKey: srvKey,
      });
    }

    const version = await DocumentVersion.create({
      fileId: file._id,
      version: 1,
      cid,
      previousCid: "",
      editorId: req.user.id,
      editorWallet: owner?.walletAddress || "",
      encrypted: isEncrypted,
      encryptedKeys,
      fileHash,
    });

    // Log blockchain version (non-blocking)
    logVersionOnChain(
      process.env.OWNER_PRIVATE_KEY,
      process.env.CONTRACT_ADDRESS,
      process.env.RPC_URL,
      { fileHash, previousCid: "", editorWallet: owner?.walletAddress || "", version: 1, cid }
    ).then(receipt => {
      if (receipt) {
        DocumentVersion.findByIdAndUpdate(version._id, { blockchainTxHash: receipt.transactionHash }).catch(() => {});
      }
    }).catch(() => {});

    await ActivityLog.create({
      fileId: file._id,
      userId: req.user.id,
      action: "SAVED_CLOUD",
      details: `Saved "${docName}" v1 to IPFS (CID: ${cid})${isEncrypted ? " [encrypted]" : ""}`,
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
    let permission = "EDIT"; // owners have full access

    if (isOwner) {
      serverKey = file.serverEncryptedKey;
    } else {
      const access = await FileAccess.findOne({
        fileId: file._id,
        recipientEmail: userEmail,
      });
      if (!access) {
        return res.status(403).json({ error: "You don't have access to this file" });
      }
      serverKey = access.serverEncryptedKey;
      permission = access.permission || "VIEW";
    }

    // Try to get the key from the latest version's encryptedKeys for this user
    const latestVersion = await DocumentVersion.findOne({ fileId: file._id }).sort({ version: -1 });
    if (latestVersion) {
      const userKey = latestVersion.encryptedKeys.find(
        k => k.userId.toString() === userId || k.email === userEmail
      );
      if (userKey) {
        serverKey = userKey.serverEncryptedKey;
      }
    }

    // Log that the user opened/viewed this file
    await ActivityLog.create({
      fileId: file._id,
      userId: req.user.id,
      action: "OPENED",
      details: isOwner
        ? `Owner opened "${file.filename}" (v${file.currentVersion || 1})`
        : `${userEmail} opened shared file "${file.filename}" (v${file.currentVersion || 1})`,
      ipAddress: req.ip || "",
    });

    // 3. Fetch content from IPFS (latest CID)
    const ipfsData = await fetchFromIPFS(file.cid);
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
        const rawAesKey = serverDecrypt(serverKey);
        const bytes = CryptoJS.AES.decrypt(ipfsData.encryptedContent, rawAesKey);
        const html = bytes.toString(CryptoJS.enc.Utf8);

        if (!html) {
          return res.status(500).json({ error: "Decryption produced empty result" });
        }

        return res.json({
          html, filename: file.filename, cid: file.cid,
          encrypted: true, permission,
          currentVersion: file.currentVersion || 1,
        });
      } catch (decErr) {
        console.error("Server decryption failed:", decErr.message);
        return res.status(500).json({ error: "Failed to decrypt document" });
      }
    }

    // 5. Unencrypted document
    const html = ipfsData.content || (typeof ipfsData === "string" ? ipfsData : JSON.stringify(ipfsData));
    return res.json({
      html, filename: file.filename, cid: file.cid,
      encrypted: false, permission,
      currentVersion: file.currentVersion || 1,
    });

  } catch (err) {
    console.error("VIEW ERROR:", err);
    res.status(500).json({ error: "Failed to load document" });
  }
});

/**
 * POST /api/doc/edit/:fileId
 * Save edits made by a shared user with EDIT permission.
 * Re-encrypts content and pins to IPFS, updates File record, logs the edit.
 */
router.post("/edit/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const userEmail = (req.user.email || "").trim().toLowerCase();
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    const isOwner = file.ownerId.toString() === userId;

    // Non-owners must have EDIT permission
    if (!isOwner) {
      const access = await FileAccess.findOne({
        fileId: file._id,
        recipientEmail: userEmail,
      });
      if (!access) {
        return res.status(403).json({ error: "You don't have access to this file" });
      }
      if (access.permission !== "EDIT") {
        return res.status(403).json({ error: "You only have VIEW permission for this file" });
      }
    }

    // === VERSION CHAIN: Generate NEW AES key for this version ===
    const newAesKey = generateAESKey();
    const previousCid = file.cid;
    const newVersion = (file.currentVersion || 1) + 1;

    // === FETCH PREVIOUS CONTENT FOR CHANGE DETECTION ===
    let changeSummary = null;
    try {
      const prevIpfsData = await fetchFromIPFS(previousCid);
      if (prevIpfsData) {
        let oldHtml = "";
        if (file.encrypted && prevIpfsData.type === "encrypted-document" && prevIpfsData.encryptedContent) {
          // Decrypt previous content to compare
          const latestVer = await DocumentVersion.findOne({ fileId: file._id }).sort({ version: -1 });
          if (latestVer) {
            const editorKey = latestVer.encryptedKeys.find(
              k => k.userId.toString() === userId || k.email === userEmail
            );
            if (editorKey) {
              const rawKey = serverDecrypt(editorKey.serverEncryptedKey);
              const bytes = CryptoJS.AES.decrypt(prevIpfsData.encryptedContent, rawKey);
              oldHtml = bytes.toString(CryptoJS.enc.Utf8);
            }
          }
        } else {
          oldHtml = prevIpfsData.content || (typeof prevIpfsData === "string" ? prevIpfsData : "");
        }
        if (oldHtml) {
          changeSummary = computeChangeSummary(oldHtml, content);
        }
      }
    } catch (diffErr) {
      console.warn("Change detection failed (non-blocking):", diffErr.message);
    }

    // Encrypt content with the new AES key
    let ipfsPayload;
    if (file.encrypted) {
      const encryptedContent = CryptoJS.AES.encrypt(content, newAesKey).toString();
      ipfsPayload = {
        type: "encrypted-document",
        encryptedContent,
        createdAt: new Date(),
      };
    } else {
      ipfsPayload = {
        type: "document",
        content,
        createdAt: new Date(),
      };
    }

    const cid = await pinJSONToIPFS(ipfsPayload);
    const fileHash = hashContent(content);

    // Encrypt the new AES key for ALL users in the access list
    const encryptedKeys = await buildEncryptedKeysForACL(file, newAesKey);

    // Also update the file's own serverEncryptedKey (for owner backward compat)
    const ownerKeyEntry = encryptedKeys.find(k => k.userId.toString() === file.ownerId.toString());
    const newOwnerSrvKey = ownerKeyEntry ? ownerKeyEntry.serverEncryptedKey : serverEncrypt(newAesKey);

    // Update file record: new CID, new version, preserve old versions on blockchain
    file.cid = cid;
    file.currentVersion = newVersion;
    file.serverEncryptedKey = newOwnerSrvKey;
    await file.save();

    // Update all FileAccess records with new encrypted keys for each recipient
    for (const keyEntry of encryptedKeys) {
      await FileAccess.updateMany(
        { fileId: file._id, recipientEmail: keyEntry.email },
        { $set: { serverEncryptedKey: keyEntry.serverEncryptedKey } }
      );
    }

    // Get editor info
    const editor = await User.findById(userId);

    // Create new version record
    const versionDoc = await DocumentVersion.create({
      fileId: file._id,
      version: newVersion,
      cid,
      previousCid,
      editorId: userId,
      editorWallet: editor?.walletAddress || "",
      encrypted: file.encrypted,
      encryptedKeys,
      fileHash,
    });

    // Log blockchain version (non-blocking)
    logVersionOnChain(
      process.env.OWNER_PRIVATE_KEY,
      process.env.CONTRACT_ADDRESS,
      process.env.RPC_URL,
      {
        fileHash,
        previousCid,
        editorWallet: editor?.walletAddress || "",
        version: newVersion,
        cid,
      }
    ).then(receipt => {
      if (receipt) {
        DocumentVersion.findByIdAndUpdate(versionDoc._id, { blockchainTxHash: receipt.transactionHash }).catch(() => {});
      }
    }).catch(() => {});

    // Build detailed modification summary
    const contentLength = content.length;
    const plainText = content.replace(/<[^>]*>/g, "");
    const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
    const editedBy = isOwner ? "Owner" : userEmail;
    const detailParts = [
      `${editedBy} created v${newVersion} of "${file.filename}"`,
      `Words: ${wordCount}`,
      `Content size: ${(contentLength / 1024).toFixed(1)} KB`,
      `Previous CID: ${previousCid ? previousCid.substring(0, 16) + "…" : "none"}`,
      `New CID: ${cid.substring(0, 16)}…`,
      `ACL: ${file.accessList.join(", ")}`,
      `Timestamp: ${new Date().toISOString()}`,
    ];

    await ActivityLog.create({
      fileId: file._id,
      userId,
      action: "VERSIONED",
      details: detailParts.join(" | "),
      ipAddress: req.ip || "",
    });

    res.json({
      message: "New version created successfully",
      cid,
      filename: file.filename,
      version: newVersion,
      previousCid,
      accessList: file.accessList,
      changeSummary,
    });
  } catch (err) {
    console.error("EDIT ERROR:", err);
    res.status(500).json({ error: "Failed to save edits" });
  }
});

/**
 * GET /api/doc/versions/:fileId
 * List all versions of a document (version chain).
 */
router.get("/versions/:fileId", auth, async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user.id;
    const userEmail = (req.user.email || "").trim().toLowerCase();

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    // Check authorization
    const isOwner = file.ownerId.toString() === userId;
    if (!isOwner) {
      const access = await FileAccess.findOne({ fileId: file._id, recipientEmail: userEmail });
      if (!access) {
        return res.status(403).json({ error: "You don't have access to this file" });
      }
    }

    const versions = await DocumentVersion.find({ fileId: file._id })
      .populate("editorId", "name email walletAddress")
      .sort({ version: -1 });

    res.json({
      fileId: file._id,
      filename: file.filename,
      currentVersion: file.currentVersion || 1,
      accessList: file.accessList || [],
      versions: versions.map(v => ({
        version: v.version,
        cid: v.cid,
        previousCid: v.previousCid,
        editor: v.editorId ? { name: v.editorId.name, email: v.editorId.email, wallet: v.editorId.walletAddress } : null,
        fileHash: v.fileHash,
        blockchainTxHash: v.blockchainTxHash,
        encrypted: v.encrypted,
        authorizedUsers: v.encryptedKeys.map(k => k.email),
        createdAt: v.createdAt,
      })),
    });
  } catch (err) {
    console.error("VERSIONS ERROR:", err);
    res.status(500).json({ error: "Failed to load versions" });
  }
});

/**
 * GET /api/doc/version/:fileId/:version
 * View a specific version of a document.
 */
router.get("/version/:fileId/:version", auth, async (req, res) => {
  try {
    const { fileId, version: versionNum } = req.params;
    const userId = req.user.id;
    const userEmail = (req.user.email || "").trim().toLowerCase();

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    // Check authorization
    const isOwner = file.ownerId.toString() === userId;
    if (!isOwner) {
      const access = await FileAccess.findOne({ fileId: file._id, recipientEmail: userEmail });
      if (!access) {
        return res.status(403).json({ error: "You don't have access to this file" });
      }
    }

    const versionDoc = await DocumentVersion.findOne({ fileId: file._id, version: parseInt(versionNum) })
      .populate("editorId", "name email");
    if (!versionDoc) return res.status(404).json({ error: "Version not found" });

    // Fetch from IPFS
    const ipfsData = await fetchFromIPFS(versionDoc.cid);
    if (!ipfsData) {
      return res.status(502).json({ error: "Failed to fetch version from IPFS" });
    }

    // Find the user's key in this version's encryptedKeys
    let serverKey = "";
    const userKey = versionDoc.encryptedKeys.find(
      k => k.userId.toString() === userId || k.email === userEmail
    );
    if (userKey) {
      serverKey = userKey.serverEncryptedKey;
    } else if (isOwner && file.serverEncryptedKey) {
      serverKey = file.serverEncryptedKey;
    }

    // Decrypt if encrypted
    if (versionDoc.encrypted && ipfsData.type === "encrypted-document" && ipfsData.encryptedContent) {
      if (!serverKey) {
        return res.status(400).json({ error: "No decryption key available for this version" });
      }
      try {
        const rawAesKey = serverDecrypt(serverKey);
        const bytes = CryptoJS.AES.decrypt(ipfsData.encryptedContent, rawAesKey);
        const html = bytes.toString(CryptoJS.enc.Utf8);
        if (!html) return res.status(500).json({ error: "Decryption produced empty result" });

        return res.json({
          html, filename: file.filename, cid: versionDoc.cid,
          version: versionDoc.version, encrypted: true,
          editor: versionDoc.editorId ? { name: versionDoc.editorId.name, email: versionDoc.editorId.email } : null,
          fileHash: versionDoc.fileHash,
          createdAt: versionDoc.createdAt,
        });
      } catch (decErr) {
        console.error("Version decryption failed:", decErr.message);
        return res.status(500).json({ error: "Failed to decrypt version" });
      }
    }

    // Unencrypted
    const html = ipfsData.content || (typeof ipfsData === "string" ? ipfsData : JSON.stringify(ipfsData));
    return res.json({
      html, filename: file.filename, cid: versionDoc.cid,
      version: versionDoc.version, encrypted: false,
      editor: versionDoc.editorId ? { name: versionDoc.editorId.name, email: versionDoc.editorId.email } : null,
      fileHash: versionDoc.fileHash,
      createdAt: versionDoc.createdAt,
    });
  } catch (err) {
    console.error("VERSION VIEW ERROR:", err);
    res.status(500).json({ error: "Failed to load version" });
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
