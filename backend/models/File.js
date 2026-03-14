// backend/models/File.js
const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  ownerWallet: { type: String, default: "" },
  filename: { type: String, required: true },
  cid: { type: String, required: true },
  mimeType: { type: String },
  size: { type: Number },
  encrypted: { type: Boolean, default: false },
  encryptedKey: { type: String, default: "" },
  serverEncryptedKey: { type: String, default: "" },
  // Version chain
  currentVersion: { type: Number, default: 1 },
  // Access Control List — emails of all users who have ever had access
  accessList: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);
