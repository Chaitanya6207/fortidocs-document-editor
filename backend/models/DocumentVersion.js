const mongoose = require("mongoose");

const versionKeySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true },
  serverEncryptedKey: { type: String, required: true },
}, { _id: false });

const documentVersionSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File", required: true },
  version: { type: Number, required: true },
  cid: { type: String, required: true },
  previousCid: { type: String, default: "" },
  editorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  editorWallet: { type: String, default: "" },
  encrypted: { type: Boolean, default: false },
  // Per-version AES key encrypted for each authorized user
  encryptedKeys: [versionKeySchema],
  // Blockchain audit trail
  blockchainTxHash: { type: String, default: "" },
  fileHash: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

documentVersionSchema.index({ fileId: 1, version: -1 });
documentVersionSchema.index({ fileId: 1, createdAt: -1 });

module.exports = mongoose.model("DocumentVersion", documentVersionSchema);
