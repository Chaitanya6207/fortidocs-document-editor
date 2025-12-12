// backend/models/FileAccess.js
const mongoose = require('mongoose');

const accessSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: 'File', required: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // optional
  recipientEmail: { type: String, required: true },
  permission: { type: String, enum: ['VIEW','EDIT'], default: 'VIEW' },
  blockchainTxHash: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('FileAccess', accessSchema);
