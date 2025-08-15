const mongoose = require('mongoose');

const tutorReviewSchema = new mongoose.Schema(
  {
    tutor: { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

tutorReviewSchema.index({ tutor: 1, author: 1 }, { unique: true });

module.exports = mongoose.model('TutorReview', tutorReviewSchema);
