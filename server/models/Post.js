const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: '' },

  likes:   { type: Number, default: 0 },
  dislikes:{ type: Number, default: 0 },

  // users who favorited this post
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  // who authored the post (optional for mock)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
