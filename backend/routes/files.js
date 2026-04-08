// backend/routes/files.js
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const File = require('../models/File');
const { pinFileFromPath } = require('../services/pinata');
const auth = require('../middleware/auth');

const router = express.Router();

const allowedExtensions = new Set(['.txt', '.html', '.htm', '.docx']);
const allowedMimeTypes = new Set([
  'text/plain',
  'text/html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream'
]);

const upload = multer({
  dest: path.join(__dirname, '..', 'uploads'),
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const isAllowedExtension = allowedExtensions.has(extension);
    const isAllowedMimeType = allowedMimeTypes.has(file.mimetype);

    if (isAllowedExtension && isAllowedMimeType) {
      return cb(null, true);
    }

    return cb(new Error('Only TXT, HTML, and DOCX files are currently supported in the editor.'));
  }
});

// POST /api/files/upload
// multipart/form-data: file (and optional ownerWallet)
router.post('/upload', auth, (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'Invalid file upload' });
    }

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
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
      }
      console.error('Upload error', err);
      res.status(500).json({ error: 'Upload failed' });
    }
  });
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

// DELETE /api/files/:id - delete a file + related FileAccess and ActivityLog records
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ DELETE request for file:', req.params.id, 'by user:', req.user.id);

    const file = await File.findById(req.params.id);
    if (!file) {
      console.log('❌ File not found:', req.params.id);
      return res.status(404).json({ error: 'File not found' });
    }

    console.log('📄 File found:', file.filename, 'ownerId:', file.ownerId.toString(), 'userId:', req.user.id);

    // Only the owner can delete
    if (String(file.ownerId) !== String(req.user.id)) {
      console.log('🚫 Not authorized. Owner:', String(file.ownerId), 'User:', String(req.user.id));
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    const FileAccess = require('../models/FileAccess');
    const ActivityLog = require('../models/ActivityLog');

    // Remove related records
    const accessResult = await FileAccess.deleteMany({ fileId: file._id });
    console.log('🔗 Deleted FileAccess records:', accessResult.deletedCount);

    const logResult = await ActivityLog.deleteMany({ fileId: file._id });
    console.log('📋 Deleted ActivityLog records:', logResult.deletedCount);

    await File.findByIdAndDelete(file._id);
    console.log('✅ File deleted successfully:', file.filename);

    res.json({ message: 'File deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/files/:id error:', err);
    res.status(500).json({ error: 'Failed to delete file', details: err.message });
  }
});

module.exports = router;
