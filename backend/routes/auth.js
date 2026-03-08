// backend/routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ethers } = require("ethers");
const User = require("../models/User");

const router = express.Router();

/**
 * POST /api/auth/register
 * Body: { name, email, password, walletAddress }
 */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, walletAddress, encryptionPublicKey } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const nonce = crypto.randomBytes(16).toString("hex");

    const user = await User.create({
      name,
      email,
      passwordHash,
      walletAddress: walletAddress || "",
      encryptionPublicKey: encryptionPublicKey || "",
      nonce,
    });

    res.json({ message: "Registered", userId: user._id });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Missing fields" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        encryptionPublicKey: user.encryptionPublicKey || "",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/auth/nonce/:email
 * Return the current nonce (or create one) for a given email.
 */
router.get("/nonce/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.nonce) {
      user.nonce = crypto.randomBytes(16).toString("hex");
      await user.save();
    }

    res.json({ nonce: user.nonce });
  } catch (err) {
    console.error("Nonce error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/auth/verify-signature
 * Body: { email, signature, walletAddress }
 * Verify signature against stored nonce (used standalone if needed).
 */
router.post("/verify-signature", async (req, res) => {
  try {
    const { email, signature, walletAddress } = req.body;
    if (!email || !signature || !walletAddress) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const msg = `Login nonce: ${user.nonce || ""}`;
    let recovered;
    try {
      recovered = ethers.verifyMessage(msg, signature); // ethers v6
    } catch (err) {
      console.error("Signature verify exception:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: "Signature does not match wallet" });
    }

    user.nonce = crypto.randomBytes(16).toString("hex");
    await user.save();

    res.json({ ok: true });
  } catch (err) {
    console.error("verify-signature error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * POST /api/auth/login-verify
 * Body: { email, password, walletAddress, signature }
 * Combined password + signature verification. Issues JWT only if both checks pass.
 */
router.post("/login-verify", async (req, res) => {
  try {
    const { email, password, walletAddress, signature } = req.body;
    if (!email || !password || !walletAddress || !signature) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const msg = `Login nonce: ${user.nonce || ""}`;
    let recovered;
    try {
      recovered = ethers.verifyMessage(msg, signature);
    } catch (err) {
      console.error("Signature verify exception:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    if (recovered.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({ error: "Signature does not match wallet" });
    }

    // Optionally enforce wallet match with stored wallet:
    // if (user.walletAddress && user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    //   return res.status(400).json({ error: "Wallet does not match registered wallet" });
    // }

    // If wallet not stored yet, bind it (optional)
    if (!user.walletAddress || user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      user.walletAddress = walletAddress;
    }

    // rotate nonce
    user.nonce = crypto.randomBytes(16).toString("hex");
    await user.save();

    const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        walletAddress: user.walletAddress,
        encryptionPublicKey: user.encryptionPublicKey || "",
      },
    });
  } catch (err) {
    console.error("login-verify error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
