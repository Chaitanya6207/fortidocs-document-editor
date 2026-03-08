// backend/routes/keys.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");

/**
 * POST /api/keys/public
 * Store the caller's encryption public key.
 * Body: { encryptionPublicKey }
 */
router.post("/public", auth, async (req, res) => {
  try {
    const { encryptionPublicKey } = req.body;
    if (!encryptionPublicKey) {
      return res.status(400).json({ error: "Missing encryptionPublicKey" });
    }

    await User.findByIdAndUpdate(req.user.id, { encryptionPublicKey });
    res.json({ message: "Encryption public key saved" });
  } catch (err) {
    console.error("POST /api/keys/public error:", err);
    res.status(500).json({ error: "Failed to save public key" });
  }
});

/**
 * GET /api/keys/public/:email
 * Get another user's encryption public key by email.
 * Used when sharing — need to encrypt AES key for the recipient.
 */
router.get("/public/:email", auth, async (req, res) => {
  try {
    const email = (req.params.email || "").trim().toLowerCase();
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!user.encryptionPublicKey) {
      return res.status(400).json({
        error: "Recipient has not registered their encryption key. They need to connect their wallet first.",
      });
    }

    res.json({
      email: user.email,
      walletAddress: user.walletAddress,
      encryptionPublicKey: user.encryptionPublicKey,
    });
  } catch (err) {
    console.error("GET /api/keys/public/:email error:", err);
    res.status(500).json({ error: "Failed to get public key" });
  }
});

module.exports = router;
