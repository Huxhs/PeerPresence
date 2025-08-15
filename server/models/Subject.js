const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
  },
  { timestamps: true }
);

SubjectSchema.index({ name: 1 });
SubjectSchema.index({ description: 1 });

module.exports = mongoose.model('Subject', SubjectSchema);
