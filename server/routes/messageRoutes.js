const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Conversation = require('../models/Conversation');
const DirectMessage = require('../models/DirectMessage');
const User = require('../models/User');
const Tutor = require('../models/Tutor');
const auth = require('../middleware/auth');

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

async function ensureTutorUserId(tutor) {
  if (!tutor) return null;

  if (tutor.userId) {
    const u = await User.findById(tutor.userId).select('_id').lean();
    if (u?._id) return String(u._id);
  }

  if (tutor.email) {
    const existing = await User.findOne({ email: tutor.email.toLowerCase() })
      .select('_id')
      .lean();
    if (existing?._id) {
      await Tutor.findByIdAndUpdate(tutor._id, { $set: { userId: existing._id } });
      return String(existing._id);
    }
  }

  const password = await bcrypt.hash(
    'autolink-' + String(tutor._id) + '-' + Math.random().toString(36).slice(2),
    10
  );

  const emailBase =
    (tutor.email && tutor.email.toLowerCase()) ||
    `tutor_${String(tutor._id)}@noemail.peerpresence`;

  let email = emailBase;
  if (await User.findOne({ email }).lean()) {
    email = `tutor_${String(tutor._id)}_${Date.now()}@noemail.peerpresence`;
  }

  const shadow = await User.create({
    name: tutor.name || 'Tutor',
    email,
    password,
    role: 'tutor',
    bio: tutor.bio || '',
    avatarUrl: tutor.avatar || '',
  });

  await Tutor.findByIdAndUpdate(tutor._id, { $set: { userId: shadow._id } });

  return String(shadow._id);
}

async function resolveToUserId(rawId) {
  const id = String(rawId || '');
  if (!isObjectId(id)) {
    const err = new Error('Invalid id');
    err.status = 400;
    throw err;
  }

  const userHit = await User.findById(id).select('_id').lean();
  if (userHit?._id) return String(userHit._id);

  const tutor = await Tutor.findById(id).select('_id name email avatar bio userId').lean();
  if (tutor) {
    const userId = await ensureTutorUserId(tutor);
    if (userId) return userId;

    const err = new Error('Tutor has no linked user account');
    err.status = 404;
    throw err;
  }

  const err = new Error('Peer not found as User or Tutor');
  err.status = 404;
  throw err;
}
router.get('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!isObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const meUserId = await resolveToUserId(req.user.id);

    const participants = (convo.participants || []).map((p) => String(p));
    if (!participants.includes(String(meUserId))) {
      return res.status(403).json({ message: 'Not a participant in this conversation' });
    }

    const msgs = await DirectMessage.find({ conversation: conversationId })
      .sort({ createdAt: 1 })
      .lean();

    res.json(msgs);
  } catch (e) {
    const status = e.status || 500;
    if (status !== 500) return res.status(status).json({ message: e.message });
    console.error('list messages error:', e);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

router.post('/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!isObjectId(conversationId)) {
      return res.status(400).json({ message: 'Invalid conversation id' });
    }

    let text = (req.body.text || '').trim();
    if (!text) return res.status(400).json({ message: 'text required' });
    if (text.length > 4000) text = text.slice(0, 4000);

    const convo = await Conversation.findById(conversationId).lean();
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const meUserId = await resolveToUserId(req.user.id);

    const participants = (convo.participants || []).map((p) => String(p));
    if (!participants.includes(String(meUserId))) {
      return res.status(403).json({ message: 'Not a participant in this conversation' });
    }

    const toUserId = participants.find((p) => p !== String(meUserId)) || String(meUserId);

    const msg = await DirectMessage.create({
      conversation: conversationId,
      from: meUserId,
      to: toUserId,
      text,
    });

    await Conversation.findByIdAndUpdate(
      conversationId,
      {
        $set: {
          lastMessageAt: new Date(),
          lastMessageText: text,
        },
      },
      { new: true }
    );

    const io = req.app.get('io');
    if (io) {
      const json = msg.toObject ? msg.toObject() : msg;
      io.to(String(conversationId)).emit('message:new', json);
      io.to(`user:${toUserId}`).emit('notify:dm', {
        conversationId: String(conversationId),
        from: String(meUserId),
        text,
        createdAt: json.createdAt,
      });
    }

    res.json(msg);
  } catch (e) {
    const status = e.status || 500;
    if (status !== 500) return res.status(status).json({ message: e.message });
    console.error('send message error:', e);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

module.exports = router;
