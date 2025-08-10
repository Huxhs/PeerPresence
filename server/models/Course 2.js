const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, unique: true, trim: true },
    imageUrl: { type: String, default: '' },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
