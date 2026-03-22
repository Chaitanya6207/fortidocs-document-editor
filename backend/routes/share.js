const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const FileAccess = require("../models/FileAccess");
const File = require("../models/File");
const User = require("../models/User");
const DocumentVersion = require("../models/DocumentVersion");
const ActivityLog = require("../models/ActivityLog");
const { serverEncrypt, serverDecrypt } = require("../services/serverCrypto");

console.log("🔥 share.js loaded");

// TEST
router.get("/test", (req, res) => {
  res.json({ ok: true });
});

// SHARE FILE
router.post("/", auth, async (req, res) => {
  try {
    console.log("📩 SHARE BODY:", req.body);
    console.log("👤 USER:", req.user);

    const { fileId, recipientEmail, encryptedKey, aesKey, permission } = req.body;

    if (!fileId || !recipientEmail) {
      return res.status(400).json({ error: "Missing fileId or recipientEmail" });
    }

    const perm = (permission === "EDIT") ? "EDIT" : "VIEW";
    const normalizedEmail = recipientEmail.trim().toLowerCase();

    const file = await File.findById(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Authorization: allow owner OR any user in ACL with EDIT permission to share
    const sharerEmail = (req.user.email || "").trim().toLowerCase();
    const isOwner = file.ownerId.toString() === req.user.id;
    if (!isOwner) {
      const sharerAccess = await FileAccess.findOne({
        fileId: file._id,
        recipientEmail: sharerEmail,
        permission: "EDIT",
      });
      if (!sharerAccess) {
        return res.status(403).json({ error: "You don't have permission to share this file" });
      }
    }

    // Server-encrypt the AES key for the recipient
    let srvKey = "";
    if (aesKey) {
      srvKey = serverEncrypt(aesKey);
    } else {
      // Derive the key: get the sharer's key from the latest version and re-encrypt for recipient
      const latestVersion = await DocumentVersion.findOne({ fileId: file._id }).sort({ version: -1 });
      if (latestVersion) {
        const sharerKey = latestVersion.encryptedKeys.find(
          k => k.userId.toString() === req.user.id || k.email === sharerEmail
        );
        if (sharerKey) {
          // Decrypt the AES key and re-encrypt for the new recipient
          const rawAesKey = serverDecrypt(sharerKey.serverEncryptedKey);
          srvKey = serverEncrypt(rawAesKey);
        }
      }
      if (!srvKey && file.serverEncryptedKey) {
        srvKey = file.serverEncryptedKey;
      }
    }

    const access = await FileAccess.findOneAndUpdate(
      { fileId: file._id, recipientEmail: normalizedEmail },
      {
        $set: {
          ownerId: req.user.id,
          permission: perm,
          encryptedKey: encryptedKey || "",
          serverEncryptedKey: srvKey,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    // === UPDATE ACCESS CONTROL LIST ===
    if (!file.accessList) file.accessList = [];
    if (!file.accessList.includes(normalizedEmail)) {
      file.accessList.push(normalizedEmail);
      await file.save();
    }

    // Add the recipient's key to the latest version's encryptedKeys
    if (srvKey) {
      const recipientUser = await User.findOne({ email: normalizedEmail });
      if (recipientUser) {
        const latestVersion = await DocumentVersion.findOne({ fileId: file._id }).sort({ version: -1 });
        if (latestVersion) {
          const alreadyHasKey = latestVersion.encryptedKeys.some(
            k => k.email === normalizedEmail
          );
          if (!alreadyHasKey) {
            latestVersion.encryptedKeys.push({
              userId: recipientUser._id,
              email: normalizedEmail,
              serverEncryptedKey: srvKey,
            });
            await latestVersion.save();
          }
        }
      }
    }

    console.log("✅ FileAccess created:", access);

    // Log the share action with sharer identity
    const sharerUser = await User.findById(req.user.id);
    const sharerName = sharerUser?.name || sharerEmail;
    await ActivityLog.create({
      fileId: file._id,
      userId: req.user.id,
      action: "SHARED",
      details: `${sharerName} shared with ${normalizedEmail} [${perm}]${encryptedKey ? " [encrypted]" : ""} | ACL: ${file.accessList.join(", ")}`,
    });

    res.json(access);
  } catch (err) {
    console.error("❌ SHARE ERROR:", err);
    res.status(500).json({ error: "Share failed" });
  }
});

// SENT
router.get("/sent", auth, async (req, res) => {
  try {
    const sent = await FileAccess.find({ ownerId: req.user.id })
      .populate("fileId")
      .sort({ createdAt: -1 });

    // Filter out entries whose File was deleted
    const valid = sent.filter((s) => s.fileId != null);

    // Clean up orphaned access records in the background
    const orphanIds = sent.filter((s) => s.fileId == null).map((s) => s._id);
    if (orphanIds.length) {
      FileAccess.deleteMany({ _id: { $in: orphanIds } }).catch(() => {});
    }

    res.json(valid);
  } catch (err) {
    console.error("GET /api/share/sent error:", err);
    res.status(500).json({ error: "Failed to load sent files" });
  }
});

// DELETE /api/share/:id - revoke a sent share (delete FileAccess record)
router.delete("/:id", auth, async (req, res) => {
  try {
    const access = await FileAccess.findById(req.params.id);
    if (!access) return res.status(404).json({ error: "Share record not found" });

    // Only the owner who shared can revoke
    if (access.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Not authorized to revoke this share" });
    }

    await FileAccess.findByIdAndDelete(access._id);

    // Log the revoke action
    await ActivityLog.create({
      fileId: access.fileId,
      userId: req.user.id,
      action: "DELETED",
      details: `Revoked share to ${access.recipientEmail}`,
    });

    res.json({ message: "Share revoked successfully" });
  } catch (err) {
    console.error("DELETE /api/share/:id error:", err);
    res.status(500).json({ error: "Failed to revoke share" });
  }
});

// RECEIVED
router.get("/received", auth, async (req, res) => {
  try {
    const userEmail = (req.user.email || "").trim().toLowerCase();

    const received = await FileAccess.find({
      recipientEmail: userEmail,
    })
      .populate("fileId")
      .populate("ownerId", "name email")
      .sort({ createdAt: -1 });

    // Filter out entries whose File was deleted from DB
    const valid = received.filter((r) => r.fileId != null);

    // Clean up orphaned access records in the background
    const orphanIds = received.filter((r) => r.fileId == null).map((r) => r._id);
    if (orphanIds.length) {
      FileAccess.deleteMany({ _id: { $in: orphanIds } }).catch(() => {});
    }

    res.json(valid);
  } catch (err) {
    console.error("GET /api/share/received error:", err);
    res.status(500).json({ error: "Failed to load received files" });
  }
});

module.exports = router;
