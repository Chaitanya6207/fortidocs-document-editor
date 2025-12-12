// backend/routes/files.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const { pinFileFromPath } = require('../services/pinata');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') }); // ensure uploads/ exists

// POST /api/files/upload
// multipart/form-data: file (and optional ownerWallet)
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // pin to pinata
    const result = await pinFileFromPath(req.file.path, req.file.originalname);

    // create db record
    const fileDoc = await File.create({
      ownerId: req.user.id,
      ownerWallet: req.body.ownerWallet || '',
      filename: req.file.originalname,
      cid: result.IpfsHash || result.ipfsHash || result.hash, // some responses vary
      mimeType: req.file.mimetype,
      size: req.file.size
    });

    // cleanup temp file
    try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }

    res.json({
      fileId: fileDoc._id,
      cid: fileDoc.cid,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${fileDoc.cid}`
    });
  } catch (err) {
    console.error('Upload error', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// GET /api/files/my - list files owned by logged-in user
router.get('/my', auth, async (req, res) => {
  try {
    const files = await File.find({ ownerId: req.user.id }).sort({ createdAt: -1 });
    res.json(files);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// GET /api/files/:id - get file metadata
router.get('/:id', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    res.json(file);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

module.exports = router;
