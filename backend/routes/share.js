// backend/routes/share.js
const express = require('express');
const FileAccess = require('../models/FileAccess');
const File = require('../models/File');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { sendShareEmail } = require('../services/email'); // optional email service

const router = express.Router();

// Try to load chain logging service optionally. If it doesn't exist, continue without error.
let logShareOnChain = null;
try {
  // services/chain.js should export { logShareOnChain }
  const chainSvc = require('../services/chain');
  logShareOnChain = chainSvc.logShareOnChain;
} catch (err) {
  console.warn('Chain service not found or failed to load — chain logging disabled.');
}

/**
 * POST /api/share
 * Body: { fileId, recipientEmail, permission }
 */
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

    // If chain logging is available, call it and store tx hash
    if (typeof logShareOnChain === 'function') {
      try {
        const recipientAddress = (recipient && recipient.walletAddress) ? recipient.walletAddress : "0x0000000000000000000000000000000000000000";
        const receipt = await logShareOnChain(process.env.OWNER_PRIVATE_KEY, process.env.CONTRACT_ADDRESS, process.env.RPC_URL, recipientAddress, file.cid, 'SHARE');
        if (receipt && (receipt.transactionHash || receipt.txHash)) {
          access.blockchainTxHash = receipt.transactionHash || receipt.txHash;
          await access.save();
        }
      } catch (chainErr) {
        console.warn('Chain logging failed:', chainErr && chainErr.message ? chainErr.message : chainErr);
        // don't fail the entire share because chain logging failed
      }
    }

    // send email (optional) — won't error if SMTP not configured, service handles that
    try {
      await sendShareEmail(recipientEmail, file.cid, 'A user');
    } catch (emailErr) {
      console.warn('Email send failed (ignored):', emailErr && emailErr.message ? emailErr.message : emailErr);
    }

    res.json({ ok: true, accessId: access._id, txHash: access.blockchainTxHash || null });
  } catch (err) {
    console.error('Share error', err);
    res.status(500).json({ error: 'Share failed' });
  }
});

module.exports = router;
