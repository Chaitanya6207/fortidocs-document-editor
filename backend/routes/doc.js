const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const auth = require("../middleware/auth");
const Document = require("../models/Document");
const { pinFileFromPath } = require("../services/pinata");

const upload = multer({ dest: "uploads/" });
const router = express.Router();

router.post("/save", auth, upload.single("file"), async (req, res) => {
  try {
    const result = await pinFileFromPath(
      req.file.path,
      req.file.originalname
    );

    await Document.create({
      ownerId: req.user.id,
      filename: req.file.originalname,
      cid: result.IpfsHash,
    });

    fs.unlinkSync(req.file.path);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Save failed" });
  }
});

module.exports = router;
