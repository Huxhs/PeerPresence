// server/routes/conversationRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');

const Conversation = require('../models/Conversation');
const User = require('../models/User');
const Tutor = require('../models/Tutor');

const isObjectId = (v) => mongoose.Types.ObjectId.isValid(v);

/**
 * Ensure a Tutor has a linked User account and return that User _id.
 * Order: tutor.userId -> User by email -> create shadow User (role: tutor).
 */
async function ensureTutorUserId(tutor) {
  if (!tutor) return null;

  // 1) already linked?
  if (tutor.userId) {
    const u = await User.findById(tutor.userId).select('_id').lean();
    if (u?._id) return String(u._id);
  }

  // 2) link by email if possible
  if (tutor.email) {
    const existing = await User.findOne({ email: tutor.email.toLowerCase() })
      .select('_id')
      .lean();
    if (existing?._id) {
      await Tutor.findByIdAndUpdate(tutor._id, { $set: { userId: existing._id } });
      return String(existing._id);
    }
  }

  // 3) create a shadow user (so DMs always have real User participants)
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

/** Resolve any incoming id (User or Tutor) to a concrete User _id. */
async function resolveToUserId(rawId) {
  const id = String(rawId || '');
  if (!isObjectId(id)) {
    const err = new Error('Invalid id');
    err.status = 400;
    throw err;
  }

  // Already a User id?
  const userHit = await User.findById(id).select('_id').lean();
  if (userHit?._id) return String(userHit._id);

  // Tutor id -> ensure a linked user exists
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

/**
 * POST /api/conversations/start
 * Body: { userId } where userId can be User _id or Tutor _id
 * Normalize BOTH sides to User ids before creating/finding the convo.
 */
router.post('/start', auth, async (req, res) => {
  try {
    const me = await resolveToUserId(req.user.id);
    const peer = await resolveToUserId(req.body.userId);

    const pair = [me, peer].sort();

    let convo = await Conversation.findOne({
      participants: { $all: pair, $size: 2 },
    });

    if (!convo) {
      convo = await Conversation.create({
        type: 'dm',
        participants: pair,
      });
    }

    res.json(convo);
  } catch (e) {
    const status = e.status || 500;
    if (status !== 500) {
      return res.status(status).json({ message: e.message || 'Invalid peer' });
    }
    console.error('start conversation error:', e);
    res.status(500).json({ message: 'Failed to start conversation' });
  }
});

/**
 * GET /api/conversations/mine
 * Returns a deduped list of my DMs.
 * Key points:
 *  - Normalize "me" to a User id.
 *  - Use the stored OTHER participant user id directly (no re-resolve).
 *  - Decorate peer preferring Tutor branding (name/avatar) by userId.
 */
router.get('/mine', auth, async (req, res) => {
  try {
    const me = await resolveToUserId(req.user.id);

    const convos = await Conversation.find({ participants: me })
      .sort({ updatedAt: -1 })
      .lean();

    const byPeer = new Map();

    for (const c of convos) {
      // participants are stored as User ids; pick the other one
      const otherUserId = String((c.participants || []).map(String).find((p) => p !== String(me)) || '');
      if (!otherUserId) continue;

      const prev = byPeer.get(otherUserId);
      if (!prev || new Date(c.updatedAt) > new Date(prev.updatedAt)) {
        byPeer.set(otherUserId, { ...c, _peerUserId: otherUserId });
      }
    }

    const result = [];
    for (const item of byPeer.values()) {
      const peerUserId = item._peerUserId;

      // Prefer Tutor display for that userId; fallback to User
      const [userDoc, tutorDoc] = await Promise.all([
        isObjectId(peerUserId) ? User.findById(peerUserId).lean() : null,
        isObjectId(peerUserId) ? Tutor.findOne({ userId: peerUserId }).lean() : null,
      ]);

      const displayName =
        (tutorDoc && tutorDoc.name) ||
        (userDoc && userDoc.name) ||
        'User';

      const displayAvatar =
        (tutorDoc && tutorDoc.avatar) ||
        (userDoc && (userDoc.avatar || userDoc.avatarUrl)) ||
        (userDoc && userDoc.profile && userDoc.profile.avatarUrl) ||
        '';

      const peer = { _id: peerUserId, name: displayName, avatar: displayAvatar };

      const { _peerUserId, ...rest } = item;
      result.push({ ...rest, peer });
    }

    res.json(result);
  } catch (e) {
    console.error('list my conversations error:', e);
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
});

module.exports = router;
