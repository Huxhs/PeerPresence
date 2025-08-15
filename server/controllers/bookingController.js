// server/controllers/bookingController.js
const mongoose = require('mongoose');
const Booking  = require('../models/Booking');
const Tutor    = require('../models/Tutor');
const User     = require('../models/User');

const isValidId = (v) => mongoose.Types.ObjectId.isValid(String(v || ''));

const confirm = async (req, res) => {
  try {
    const studentId = req.user?._id || req.user?.id;
    if (!isValidId(studentId)) return res.status(401).json({ message: 'Unauthorized' });

    const student = await User.findById(studentId).lean();
    if (!student) return res.status(401).json({ message: 'Unauthorized' });

    const {
      tutorId, subject, date, time, timezone,
      duration, topic, signatureName, signatureDate,
      currency = 'CAD', method, nameOnCard, cardNumber, expiry, cvc, postalCode,
      promoCode,
    } = req.body;

    if (!isValidId(tutorId)) return res.status(400).json({ message: 'Invalid tutor id' });
    if (!subject || !date || !time) {
      return res.status(400).json({ message: 'Missing required fields (subject, date, time)' });
    }

    const tutor = await Tutor.findById(tutorId).lean();
    if (!tutor) return res.status(404).json({ message: 'Tutor not found' });

    const baseFromDuration = (d) =>
      String(d) === '30' ? 30 : String(d) === '90' ? 80 : 55;
    const base = baseFromDuration(duration);
    const discountPct = promoCode && promoCode.toUpperCase() === 'NEWUSER' ? 0.10 : 0;
    const discounted = +(base * (1 - discountPct)).toFixed(2);
    const serviceFee = +(discounted * 0.03).toFixed(2);
    const tax = +(discounted * 0.13).toFixed(2);
    const total = +(discounted + serviceFee + tax).toFixed(2);

    const booking = await Booking.create({
      student: student._id,
      tutor: tutor._id,
      subject,
      date,
      time,
      timezone,
      duration: Number(duration),
      topic: topic || '',
      signatureName,
      signatureDate,
      pricing: {
        currency,
        base,
        discount: +(base - discounted).toFixed(2),
        serviceFee,
        tax,
        total,
      },
      meta: {
        method: method || 'card',
        nameOnCard: nameOnCard || '',
        cardLast4: (cardNumber || '').replace(/\s+/g, '').slice(-4),
        expiry: expiry || '',
        postalCode: postalCode || '',
      },
    });

    // Upsert into user's subjects (drives the /subjects page)
    const lastSession = {
      bookingId: booking._id,
      tutorId: tutor._id,
      tutorName: tutor.name,
      tutorAvatar: tutor.avatar || tutor.avatarUrl || '',
      date, time, timezone,
      duration: Number(duration),
    };

    const upd = await User.updateOne(
      { _id: student._id, 'subjects.name': subject },
      {
        $set: {
          'subjects.$.lastSession': lastSession,
          'subjects.$.lastBookedAt': new Date(),
        },
        $inc: { 'subjects.$.count': 1 },
      }
    );

    // If row didn’t exist, push a new subject item
    const matched = upd.matchedCount ?? upd.n ?? 0;
    if (matched === 0) {
      await User.updateOne(
        { _id: student._id },
        {
          $push: {
            subjects: {
              name: subject,
              count: 1,
              lastBookedAt: new Date(),
              lastSession,
            },
          },
        }
      );
    }

    return res.json({
      ok: true,
      id: booking._id,
      booking: { subject, date, time, timezone, duration: Number(duration) },
      pricing: booking.pricing,
      tutor: { _id: tutor._id, name: tutor.name },
    });
  } catch (e) {
    console.error('confirm booking error', e);
    return res.status(500).json({ message: 'Server error confirming booking' });
  }
};

const reschedule = async (req, res) => {
  try {
    const studentId = req.user?._id || req.user?.id;
    const { id } = req.params;
    if (!isValidId(studentId)) return res.status(401).json({ message: 'Unauthorized' });
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid booking id' });

    const { date, time, timezone } = req.body;

    const booking = await Booking.findOne({ _id: id, student: studentId });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.date = date || booking.date;
    booking.time = time || booking.time;
    booking.timezone = timezone || booking.timezone;
    await booking.save();

    // reflect in subjects.lastSession
    await User.updateOne(
      { _id: studentId, 'subjects.name': booking.subject },
      {
        $set: {
          'subjects.$.lastBookedAt': new Date(),
          'subjects.$.lastSession.date': booking.date,
          'subjects.$.lastSession.time': booking.time,
          'subjects.$.lastSession.timezone': booking.timezone,
          'subjects.$.lastSession.duration': booking.duration,
        },
      }
    );

    return res.json({ ok: true, booking });
  } catch (e) {
    console.error('reschedule booking error', e);
    return res.status(500).json({ message: 'Server error rescheduling booking' });
  }
};

const cancel = async (req, res) => {
  try {
    const studentId = req.user?._id || req.user?.id;
    const { id } = req.params;
    if (!isValidId(studentId)) return res.status(401).json({ message: 'Unauthorized' });
    if (!isValidId(id)) return res.status(400).json({ message: 'Invalid booking id' });

    const booking = await Booking.findOneAndDelete({ _id: id, student: studentId });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    // remove the subject row from user's subjects
    await User.updateOne(
      { _id: studentId },
      { $pull: { subjects: { name: booking.subject } } }
    );

    return res.json({ ok: true, message: 'Booking cancelled. Refund will be processed shortly.' });
  } catch (e) {
    console.error('delete booking error', e);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { confirm, reschedule, cancel };
