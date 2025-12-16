// backend/routes/received.js
const express = require('express');
const auth = require('../middleware/auth');
const FileAccess = require('../models/FileAccess');
const File = require('../models/File');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/share/received
 * Returns files shared with the logged-in user (by email or receiverId).
 */
router.get('/received', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const userEmail = (user.email || '').trim().toLowerCase();

    // find fileAccess entries where recipientEmail (normalized) equals userEmail
    // OR receiverId was explicitly set to this user's id
    const matches = await FileAccess.find({
      $or: [
        { recipientEmail: userEmail },
        { receiverId: req.user.id }
      ]
    }).sort({ createdAt: -1 });

    // gather file IDs and fetch files in one query
    const fileIds = matches.map(m => m.fileId);
    const files = await File.find({ _id: { $in: fileIds } });
    const filesById = {};
    files.forEach(f => filesById[f._id.toString()] = f);

    const output = matches.map(acc => {
      const file = filesById[acc.fileId.toString()];
      if (!file) return null;
      return {
        accessId: acc._id,
        sharedAt: acc.createdAt,
        permission: acc.permission,
        ownerId: acc.ownerId,
        recipientEmail: acc.recipientEmail,
        blockchainTxHash: acc.blockchainTxHash || null,
        file: {
          id: file._id,
          filename: file.filename,
          cid: file.cid,
          gatewayUrl: `https://gateway.pinata.cloud/ipfs/${file.cid}`,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdAt
        }
      };
    }).filter(Boolean);

    res.json(output);
  } catch (err) {
    console.error('GET /api/share/received error', err);
    res.status(500).json({ error: 'Failed to load received shares' });
  }
});

module.exports = router;
