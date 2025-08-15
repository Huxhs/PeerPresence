// server/routes/tutorRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Tutor = require('../models/Tutor');
const TutorReview = require('../models/TutorReview');
const protect = require('../middleware/authMiddleware');

// ---------- helpers ----------
function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

function escapeRegex(s = '') {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getRatingStats(tutorId) {
  const agg = await TutorReview.aggregate([
    { $match: { tutor: new mongoose.Types.ObjectId(tutorId) } },
    {
      $group: {
        _id: '$tutor',
        ratingAvg: { $avg: '$rating' },
        ratingCount: { $sum: 1 },
      },
    },
  ]);
  const s = agg[0] || { ratingAvg: 0, ratingCount: 0 };
  return {
    ratingAvg: Number(s.ratingAvg || 0),
    ratingCount: Number(s.ratingCount || 0),
  };
}

/**
 * ---------- search by subject ----------
 * Example: GET /api/tutors/search?subject=React&limit=5
 * - min 2 characters
 * - matches case-insensitively against the string array "subjects"
 * - returns up to 5 tutors
 */
router.get('/search', async (req, res) => {
  try {
    const term = String(req.query.subject || req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit || '5', 10), 5);

    if (term.length < 2) return res.json([]);

    const rx = new RegExp(escapeRegex(term), 'i');

    // For arrays of strings, regex directly against the field works (matches any element)
    const tutors = await Tutor.find({ subjects: { $regex: rx } })
      .select('_id name avatar rating reviewsCount subjects bio')
      .sort({ rating: -1, name: 1 })
      .limit(limit)
      .lean();

    res.json(tutors);
  } catch (e) {
    console.error('Tutor search error:', e);
    res.status(500).json({ message: 'Failed to search tutors' });
  }
});

// ---------- list/search (general) ----------
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;

    let filter = {};
    if (q && q.trim()) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      filter = {
        $or: [
          { name: { $regex: rx } },
          { bio: { $regex: rx } },
          { subjects: { $regex: rx } }, // array-of-strings friendly
        ],
      };
    }

    const tutors = await Tutor.find(filter).sort({ name: 1 }).lean();
    res.json(tutors);
  } catch (e) {
    console.error('Tutor list error:', e);
    res.status(500).json({ message: 'Failed to fetch tutors' });
  }
});

// ---------- detail (with rating stats) ----------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid tutor id' });
    }

    const t = await Tutor.findById(id).lean();
    if (!t) return res.status(404).json({ message: 'Tutor not found' });

    const stats = await getRatingStats(id);

    // Back-compat fields (rating/reviewsCount) + new fields
    const payload = {
      ...t,
      ratingAvg: stats.ratingAvg,
      ratingCount: stats.ratingCount,
      rating: typeof t.rating === 'number' ? t.rating : stats.ratingAvg,
      reviewsCount:
        typeof t.reviewsCount === 'number' ? t.reviewsCount : stats.ratingCount,
    };

    res.json(payload);
  } catch (e) {
    console.error('Tutor detail error:', e);
    res.status(500).json({ message: 'Failed to fetch tutor' });
  }
});

// ---------- reviews: list ----------
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid tutor id' });
    }

    const reviews = await TutorReview.find({ tutor: id })
      .sort({ createdAt: -1 })
      .populate('author', 'name avatarUrl')
      .lean();

    res.json(reviews);
  } catch (e) {
    console.error('Tutor reviews list error:', e);
    res.status(500).json({ message: 'Failed to fetch reviews' });
  }
});

// ---------- reviews: create/replace my review ----------
router.post('/:id/reviews', protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid tutor id' });
    }

    const rating = Number(req.body.rating);
    const comment = (req.body.comment || '').trim();

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be 1-5' });
    }

    // upsert: one review per user per tutor
    const review = await TutorReview.findOneAndUpdate(
      { tutor: id, author: req.user._id },
      { tutor: id, author: req.user._id, rating, comment },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate('author', 'name avatarUrl')
      .lean();

    res.json(review);
  } catch (e) {
    if (e.code === 11000) {
      return res.status(409).json({ message: 'You already reviewed this tutor' });
    }
    console.error('Tutor review upsert error:', e);
    res.status(500).json({ message: 'Failed to save review' });
  }
});

module.exports = router;
