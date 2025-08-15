const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tutor:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tutor', required: true },

    subject:   { type: String, required: true },
    date:      { type: String, required: true },
    time:      { type: String, required: true },
    timezone:  { type: String, default: '' },
    duration:  { type: Number, required: true },
    topic:     { type: String, default: '' },

    signatureName: { type: String, required: true },
    signatureDate: { type: String, required: true },

    pricing: {
      currency:   { type: String, default: 'CAD' },
      base:       { type: Number, required: true },
      serviceFee: { type: Number, required: true },
      tax:        { type: Number, required: true },
      total:      { type: Number, required: true },
    },
  },
  { timestamps: true }
);

BookingSchema.index({ student: 1, tutor: 1, date: 1 });

module.exports = mongoose.model('Booking', BookingSchema);
