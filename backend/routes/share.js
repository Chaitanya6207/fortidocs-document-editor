const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const FileAccess = require("../models/FileAccess");
const File = require("../models/File");
const ActivityLog = require("../models/ActivityLog");
const { serverEncrypt } = require("../services/serverCrypto");

console.log("🔥 share.js loaded");

// TEST
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

// SHARE FILE
router.post("/", auth, async (req, res) => {
  try {
    console.log("📩 SHARE BODY:", req.body);
    console.log("👤 USER:", req.user);

    const { fileId, recipientEmail, encryptedKey, aesKey } = req.body;

    if (!fileId || !recipientEmail) {
      return res.status(400).json({ error: "Missing fileId or recipientEmail" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Server-encrypt the AES key for the recipient
    let srvKey = "";
    if (aesKey) {
      srvKey = serverEncrypt(aesKey);
    } else if (file.serverEncryptedKey) {
      // Reuse the file's server-encrypted key for backward compat
      srvKey = file.serverEncryptedKey;
    }

    const access = await FileAccess.create({
      fileId: file._id,
      ownerId: req.user.id,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      permission: "VIEW",
      encryptedKey: encryptedKey || "",
      serverEncryptedKey: srvKey,
    });

    console.log("✅ FileAccess created:", access);

    // Log the share action
    await ActivityLog.create({
      fileId: file._id,
      userId: req.user.id,
      action: "SHARED",
      details: `Shared with ${recipientEmail.trim().toLowerCase()}${encryptedKey ? " [encrypted]" : ""}`,
    });

    res.json(access);
  } catch (err) {
    console.error("❌ SHARE ERROR:", err);
    res.status(500).json({ error: "Share failed" });
  }
});

// SENT
router.get("/sent", auth, async (req, res) => {
  try {
    const sent = await FileAccess.find({ ownerId: req.user.id })
      .populate("fileId")
      .sort({ createdAt: -1 });

    // Filter out entries whose File was deleted
    const valid = sent.filter((s) => s.fileId != null);

    // Clean up orphaned access records in the background
    const orphanIds = sent.filter((s) => s.fileId == null).map((s) => s._id);
    if (orphanIds.length) {
      FileAccess.deleteMany({ _id: { $in: orphanIds } }).catch(() => {});
    }

    res.json(valid);
  } catch (err) {
    console.error("GET /api/share/sent error:", err);
    res.status(500).json({ error: "Failed to load sent files" });
  }
});

// DELETE /api/share/:id - revoke a sent share (delete FileAccess record)
router.delete("/:id", auth, async (req, res) => {
  try {
    const access = await FileAccess.findById(req.params.id);
    if (!access) return res.status(404).json({ error: "Share record not found" });

    // Only the owner who shared can revoke
    if (access.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to revoke this share" });
    }

    await FileAccess.findByIdAndDelete(access._id);

    // Log the revoke action
    await ActivityLog.create({
      fileId: access.fileId,
      userId: req.user.id,
      action: "DELETED",
      details: `Revoked share to ${access.recipientEmail}`,
    });

    res.json({ message: "Share revoked successfully" });
  } catch (err) {
    console.error("DELETE /api/share/:id error:", err);
    res.status(500).json({ error: "Failed to revoke share" });
  }
});

// RECEIVED
router.get("/received", auth, async (req, res) => {
  try {
    const userEmail = (req.user.email || "").trim().toLowerCase();

    const received = await FileAccess.find({
      recipientEmail: userEmail,
    })
      .populate("fileId")
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });

    // Filter out entries whose File was deleted from DB
    const valid = received.filter((r) => r.fileId != null);

    // Clean up orphaned access records in the background
    const orphanIds = received.filter((r) => r.fileId == null).map((r) => r._id);
    if (orphanIds.length) {
      FileAccess.deleteMany({ _id: { $in: orphanIds } }).catch(() => {});
    }

    res.json(valid);
  } catch (err) {
    console.error("GET /api/share/received error:", err);
    res.status(500).json({ error: "Failed to load received files" });
  }
});

module.exports = router;
