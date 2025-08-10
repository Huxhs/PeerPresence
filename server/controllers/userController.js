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
// Body: { name?, email?, bio?, avatarUrl?, subjects?[] }
exports.updateMe = async (req, res) => {
  try {
    const allow = ['name', 'email', 'bio', 'avatarUrl', 'subjects'];
    allow.forEach((k) => {
      if (req.body[k] !== undefined) req.user[k] = req.body[k];
    });
    await req.user.save();
    res.json({ ok: true });
  } catch (e) {
    console.error('updateMe error:', e);
    // handle duplicate email nicely
    if (e?.code === 11000) return res.status(400).json({ message: 'Email already in use' });
    res.status(500).json({ message: 'Failed to update profile' });
  }
};

// PATCH /api/account/password
// Body: { currentPassword, newPassword }
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Both current and new password required' });

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
// Hard delete for now. (Optional: also clean up conversations/messages)
exports.deleteMe = async (req, res) => {
  try {
    await User.deleteOne({ _id: req.user._id });
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteMe error:', e);
    res.status(500).json({ message: 'Failed to delete account' });
  }
};
