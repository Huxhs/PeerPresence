const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    email:  { type: String, required: true, lowercase: true, unique: true },
    avatar: { type: String, default: '' },
    bio:    { type: String, default: '' },
    subjects: { type: [String], default: [] }, 
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tutor', tutorSchema);
