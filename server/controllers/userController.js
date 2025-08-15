// server/controllers/userController.js
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// GET /api/account/me
exports.getMe = async (req, res) => {
  const u = req.user;
  res.json({
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    bio: u.bio || '',
    avatarUrl: u.avatarUrl || '',
    subjects: u.subjects || [],
    createdAt: u.createdAt,
  });
};

// PATCH /api/account/me
// Body: { name?, email?, bio?, avatarUrl? }
// NOTE: We intentionally DO NOT allow updating subjects from this endpoint,
// to avoid "Cast to embedded failed" when a form sends a stringified value.
exports.updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'email', 'bio', 'avatarUrl'];
    const updates = {};

    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }

    // Hard-block these to prevent accidental casts/overwrites
    delete updates.subjects;
    delete updates.mySubjects;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    return res.json({ ok: true, user: updated });
  } catch (e) {
    console.warn('updateMe error:', e);
    if (e?.code === 11000) {
      return res.status(400).json({ message: 'Email already in use' });
    }
    return res.status(400).json({ message: 'Invalid profile update' });
  }
};

// PATCH /api/account/password
// Body: { currentPassword, newPassword }
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password required' });
    }

    const ok = await bcrypt.compare(currentPassword, req.user.password);
    if (!ok) return res.status(400).json({ message: 'Current password is incorrect' });

    const salt = await bcrypt.genSalt(10);
    req.user.password = await bcrypt.hash(newPassword, salt);
    await req.user.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('updatePassword error:', e);
    res.status(500).json({ message: 'Failed to change password' });
  }
};

// DELETE /api/account/me
exports.deleteMe = async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user._id });
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteMe error:', e);
    res.status(500).json({ message: 'Failed to delete account' });
  }
};

// GET /api/users/subjects  (alias used by some clients)
// Return the normalized list built from user.subjects[*].lastSession
exports.getMySubjects = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const me = await User.findById(userId).lean();

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
  } catch (e) {
    console.error('getMySubjects error', e);
    res.status(500).json({ message: 'Failed to load subjects' });
  }
};
