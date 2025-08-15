// server/routes/searchRoutes.js
const express = require('express');
const router = express.Router();

const Tutor = require('../models/Tutor');
const Subject = require('../models/Subject');

/**
 * Utility: build case-insensitive regex safely
 */
const rx = (q) => {
  try {
    return new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  } catch {
    return new RegExp(q, 'i');
  }
};

/**
 * GET /api/search/tutors?q=xxx&limit=5
 * Public: returns lightweight list of tutors matching name, subjects.name, or bio
 */
router.get('/tutors', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '5', 10), 50);
  if (q.length < 2) return res.json([]);

  const regex = rx(q);

  try {
const tutors = await Tutor.find(
  {
    $or: [
      { name: regex },
      { bio: regex },
      { subjects: regex },
    ],
  },
  // ⬇️ projection: include avatar (DB field), plus avatarUrl for safety
  { name: 1, bio: 1, subjects: 1, avatar: 1, avatarUrl: 1, rating: 1, reviewsCount: 1 }
)
  .limit(100)
  .lean();


    // Score: name startsWith > name includes > subjects hit > bio hit
    const qLower = q.toLowerCase();
    const score = (t) => {
      const name = (t.name || '').toLowerCase();
      const bio = (t.bio || '').toLowerCase();
      const subs = Array.isArray(t.subjects) ? t.subjects.join(' ').toLowerCase() : String(t.subjects || '').toLowerCase();

      if (name.startsWith(qLower)) return 100;
      if (name.includes(qLower)) return 75;
      if (subs.includes(qLower)) return 50;
      if (bio.includes(qLower)) return 25;
      return 0;
    };

    const ranked = tutors
      .map((t) => ({ ...t, _score: score(t) }))
      .filter((t) => t._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, limit);

    res.json(ranked);
  } catch (e) {
    console.error('search tutors error:', e);
    res.status(500).json({ message: 'Search failed' });
  }
});

/**
 * GET /api/search/subjects?q=xxx&limit=5
 * Public: returns subject docs by name (and optional description)
 */
router.get('/subjects', async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '5', 10), 50);
  if (q.length < 2) return res.json([]);

  const regex = rx(q);

  try {
    const subjects = await Subject.find(
      { $or: [{ name: regex }, { description: regex }] },
      { name: 1, description: 1 }
    )
      .limit(limit)
      .lean();

    res.json(subjects);
  } catch (e) {
    console.error('search subjects error:', e);
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;
