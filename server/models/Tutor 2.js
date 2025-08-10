const mongoose = require('mongoose');

const tutorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, unique: true },
    avatar: { type: String, default: '' }, // image URL
    bio: { type: String, default: '' },
    subjects: { type: [String], default: [] }, // e.g., ['Data Structures', 'Calculus']
    rating: { type: Number, min: 0, max: 5, default: 0 },
    reviewsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Tutor', tutorSchema);
