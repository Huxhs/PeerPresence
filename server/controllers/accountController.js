// server/controllers/accountController.js
const User = require('../models/User');

exports.getMe = async (req, res) => {
  const me = await User.findById(req.user.id).lean();
  res.json(me);
};

exports.getMySubjects = async (req, res) => {
  const me = await User.findById(req.user.id).lean();
  const list = (me?.subjects || []).map((s) => {
    const last = s.lastSession || {};
    return {
      bookingId: last.bookingId,
      subject: s.name,
      tutorId: last.tutorId,
      tutorName: last.tutorName,
      tutorAvatar: last.tutorAvatar || '',
      lastDate: last.date || '',
      lastTime: last.time || '',
      timezone: last.timezone || '',
      duration: last.duration || 0,
      updatedAt: s.lastBookedAt || me.updatedAt
    };
  });
  res.json(list);
};
