const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const ActivityLog = require("../models/ActivityLog");

/**
 * GET /api/logs/file/:fileId
 * Get all activity logs for a specific file
 */
router.get("/file/:fileId", auth, async (req, res) => {
  try {
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
