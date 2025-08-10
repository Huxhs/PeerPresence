const mongoose = require('mongoose');

const globalMessageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },     // e.g. "nick (student)"
    text: { type: String, required: true },       // message body
    timestamp: { type: String, default: '' }      // optional display time
  },
  { timestamps: true } // adds createdAt which we also use on the client
);

module.exports = mongoose.model('GlobalMessage', globalMessageSchema);
