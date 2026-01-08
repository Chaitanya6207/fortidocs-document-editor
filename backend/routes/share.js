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
  const sent = await FileAccess.find({ ownerId: req.user.id }).populate("fileId");
  res.json(sent);
});

// RECEIVED
router.get("/received", auth, async (req, res) => {
  const received = await FileAccess.find({
    recipientEmail: req.user.email,
  }).populate("fileId");

  res.json(received);
});

module.exports = router;
