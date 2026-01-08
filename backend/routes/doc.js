const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const File = require("../models/File");
const { pinJSONToIPFS } = require("../services/pinata");

/**
 * POST /api/doc/save
 * Save editor content to IPFS and MongoDB
 */
router.post("/save", auth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      return res.status(400).json({ error: "Content is required" });
    }

    // 1️⃣ Upload to IPFS
    const cid = await pinJSONToIPFS({
      type: "document",
      content,
      createdAt: new Date(),
    });

    // 2️⃣ Save File metadata (🔥 filename REQUIRED)
    const file = await File.create({
      filename: `Document-${Date.now()}.html`, // 🔥 REQUIRED FIELD
      cid,
      ownerId: req.user.id,
    });

    res.json(file);
  } catch (err) {
    console.error("❌ DOC SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save document" });
  }
});

module.exports = router;
