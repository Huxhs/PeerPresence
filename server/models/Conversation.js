// server/models/Conversation.js
const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    // Always store **User** ids here (never Tutor ids)
    participants: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
      validate: {
        validator(v) {
          // exactly two distinct users
          if (!Array.isArray(v) || v.length !== 2) return false;
          const [a, b] = v.map(String);
          return a !== b;
        },
        message: 'Conversation must have exactly two distinct participants.',
      },
    },

    // Deterministic key "minId:maxId" to prevent duplicates
    participantsKey: { type: String, unique: true, index: true },

    lastMessageAt: { type: Date, default: Date.now },
    lastMessageText: { type: String, default: '', trim: true, maxlength: 4000 },
  },
  { timestamps: true }
);

// Normalize participants & key
conversationSchema.pre('validate', function (next) {
  if (Array.isArray(this.participants) && this.participants.length === 2) {
    // Normalize + dedupe
    const uniq = Array.from(new Set(this.participants.map((p) => String(p))));
    if (uniq.length !== 2) {
      return next(new Error('Conversation must have exactly two distinct participants.'));
    }
    const [a, b] = uniq.sort();
    this.participants = [a, b];
    this.participantsKey = `${a}:${b}`;
  }
  if (!this.lastMessageAt) this.lastMessageAt = new Date();
  next();
});

// Helpful indexes for fast lookups
conversationSchema.index({ participants: 1, updatedAt: -1 }); // list "my" convos sorted by recent
conversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
