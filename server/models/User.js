const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'tutor'],
    required: true,
  },
  bio: {
    type: String,
    default: '',
  },
  subjects: {
    type: [String], // Used for tutors listing their subjects
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
