const mongoose = require('mongoose');

const globalMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('GlobalMessage', globalMessageSchema);
