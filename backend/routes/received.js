// backend/routes/received.js
const express = require('express');
const auth = require('../middleware/auth');
const FileAccess = require('../models/FileAccess');
const File = require('../models/File');
const User = require('../models/User');

const router = express.Router();

/**
 * GET /api/share/received
 * Returns files shared to the logged-in user.
 * Criteria:
 *  - If the user's email matches recipientEmail in FileAccess
 *  - OR receiverId matches req.user.id (if share targeted to registered user)
 */
router.get('/received', auth, async (req, res) => {
  try {
    // load user to get email (if needed)
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // find matches by email or receiverId
    const matches = await FileAccess.find({
      $or: [
        { recipientEmail: user.email.toLowerCase() },
        { receiverId: req.user.id }
      ]
    }).sort({ createdAt: -1 });

    // populate file metadata
    const results = [];
    for (const acc of matches) {
      const file = await File.findById(acc.fileId);
      if (!file) continue;
      results.push({
        accessId: acc._id,
        permission: acc.permission,
        sharedAt: acc.createdAt,
        blockchainTxHash: acc.blockchainTxHash || null,
        recipientEmail: acc.recipientEmail,
        ownerId: acc.ownerId,
        file: {
          id: file._id,
          filename: file.filename,
          cid: file.cid,
          gatewayUrl: `https://gateway.pinata.cloud/ipfs/${file.cid}`,
          mimeType: file.mimeType,
          size: file.size,
          createdAt: file.createdAt
        }
      });
    }

    res.json(results);
  } catch (err) {
    console.error('GET /api/share/received error', err);
    res.status(500).json({ error: 'Failed to load received shares' });
  }
});

module.exports = router;
