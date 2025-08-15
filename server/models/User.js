const mongoose = require('mongoose');
const { Schema } = mongoose;
const SubjectLastSessionSchema = new Schema(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    tutorId:   { type: Schema.Types.ObjectId, ref: 'Tutor' },
    tutorName: { type: String, default: '' },
    tutorAvatar: { type: String, default: '' },
    date:     { type: String, default: '' },
    time:     { type: String, default: '' },
    timezone: { type: String, default: '' },
    duration: { type: Number, default: 60 },
  },
  { _id: false }
);

const UserSubjectSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    lastBookedAt: { type: Date, default: Date.now },
    lastSession: { type: SubjectLastSessionSchema, default: {} },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    name:     { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['student', 'tutor', 'admin'], default: 'student' },
    bio:       { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    subjects: { type: [UserSubjectSchema], default: [] },
  },
  { timestamps: true }
);

UserSchema.index({ 'subjects.name': 1 });

module.exports = mongoose.model('User', UserSchema);
