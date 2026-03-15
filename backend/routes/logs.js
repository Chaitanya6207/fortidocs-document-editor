const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ActivityLog = require("../models/ActivityLog");
const File = require("../models/File");
const FileAccess = require("../models/FileAccess");

/**
 * GET /api/logs/file/:fileId
 * Get all activity logs for a specific file.
 * Accessible by owner and anyone in the ACL.
 */
router.get("/file/:fileId", auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    // Authorization: owner or recipient with access
    const userId = req.user.id;
    const userEmail = (req.user.email || "").trim().toLowerCase();
    const isOwner = file.ownerId.toString() === userId;

    if (!isOwner) {
      const access = await FileAccess.findOne({
        fileId: file._id,
        recipientEmail: userEmail,
      });
      if (!access) {
        return res.status(403).json({ error: "You don't have access to this file's logs" });
      }
    }

    const logs = await ActivityLog.find({ fileId: req.params.fileId })
      .populate("userId", "name email")
      .sort({ createdAt: -1 });
    res.json(logs);
  } catch (err) {
    console.error("GET /api/logs/file error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

/**
 * GET /api/logs/my
 * Get all activity logs for the current user
 */
router.get("/my", auth, async (req, res) => {
  try {
    const logs = await ActivityLog.find({ userId: req.user.id })
      .populate("fileId", "filename cid")
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    console.error("GET /api/logs/my error:", err);
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

module.exports = router;
