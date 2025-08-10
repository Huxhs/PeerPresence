const mongoose = require('mongoose');
const { Schema } = mongoose;

const conversationSchema = new Schema(
  {
    // exactly two people for 1:1
    participants: [
      { type: Schema.Types.ObjectId, ref: 'User', required: true }
    ],
    // keep it snappy in the list
    lastMessage: { type: String, default: '' },
    lastSender: { type: Schema.Types.ObjectId, ref: 'User' },

    // Soft-hide for specific users (personal archive)
    archivedBy: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
);

// enforce uniqueness of a pair (A,B) regardless of order
conversationSchema.index(
  { participants: 1 },
  { unique: false } // we’ll enforce via controller logic to allow unordered pairs
);

module.exports = mongoose.model('Conversation', conversationSchema);
