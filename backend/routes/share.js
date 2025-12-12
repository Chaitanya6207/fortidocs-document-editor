// backend/routes/share.js
const express = require('express');
const FileAccess = require('../models/FileAccess');
const File = require('../models/File');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendShareEmail } = require('../services/email');
// optional chain logger (commented)
const { logShareOnChain } = require('../services/chain'); // implement later if wanted

const router = express.Router();

// POST /api/share
// body: { fileId, recipientEmail, permission }
router.post('/', auth, async (req, res) => {
  try {
    const { fileId, recipientEmail, permission = 'VIEW' } = req.body;
    if (!fileId || !recipientEmail) return res.status(400).json({ error: 'Missing fields' });

    const file = await File.findById(fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });

    // find recipient user (if registered)
    const recipient = await User.findOne({ email: recipientEmail });

    const access = await FileAccess.create({
      fileId: file._id,
      ownerId: req.user.id,
      receiverId: recipient?._id || null,
      recipientEmail,
      permission
    });

    // optional: log on chain if you want - keep commented unless you implement services/chain.js
    /*
    const recipientAddress = (recipient && recipient.walletAddress) ? recipient.walletAddress : "0x0000000000000000000000000000000000000000";
    const receipt = await logShareOnChain(process.env.OWNER_PRIVATE_KEY, process.env.CONTRACT_ADDRESS, process.env.RPC_URL, recipientAddress, file.cid, 'SHARE');
    if (receipt) {
      access.blockchainTxHash = receipt.transactionHash || receipt.txHash || null;
      await access.save();
    }
    */

    // send email (optional)
    try {
      await sendShareEmail(recipientEmail, file.cid, 'A user'); // replace owner name if you want
    } catch (e) {
      console.warn('Email send failed', e);
    }

    res.json({ ok: true, accessId: access._id });
  } catch (err) {
    console.error('Share error', err);
    res.status(500).json({ error: 'Share failed' });
  }
});

module.exports = router;
