const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    required: true,
    enum: [
      "CREATED",
      "SAVED_CLOUD",
      "SAVED_LOCAL",
      "SHARED",
      "OPENED",
      "EXPORTED",
      "PRINTED",
      "VIEWED",
      "DOWNLOADED",
      "DELETED",
      "EDITED",
    ],
  },
  details: { type: String, default: "" },
  ipAddress: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// Index for fast lookups
activityLogSchema.index({ fileId: 1, createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
