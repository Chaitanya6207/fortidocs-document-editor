const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const FileAccess = require("../models/FileAccess");
const File = require("../models/File");

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

    const { fileId, recipientEmail } = req.body;

    if (!fileId || !recipientEmail) {
      return res.status(400).json({ error: "Missing fileId or recipientEmail" });
    }

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    const access = await FileAccess.create({
      fileId: file._id,
      ownerId: req.user.id,
      recipientEmail: recipientEmail.trim().toLowerCase(),
      permission: "VIEW",
    });

    console.log("✅ FileAccess created:", access);

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
