// server/controllers/TutorController.js
const Tutor = require('../models/Tutor');

const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function searchBySubject(req, res) {
  try {
    const term = String(req.query.subject ?? req.query.q ?? '').trim();
    const raw = parseInt(req.query.limit ?? '5', 10);
    const limit = Number.isFinite(raw) ? Math.min(Math.max(1, raw), 5) : 5;

    // min 2 letters
    if (term.length < 2) return res.json([]);

    const rx = new RegExp(escapeRegex(term), 'i');

    // subjects is an array of strings → regex directly against the field
    const tutors = await Tutor.find({ subjects: { $regex: rx } })
      .select('_id name avatar rating reviewsCount subjects bio')
      .sort({ rating: -1, name: 1 })
      .limit(limit)
      .lean();

    return res.json(tutors);
  } catch (e) {
    console.error('search tutors by subject error', e);
    return res.status(500).json({ message: 'Server error' });
  }
}

module.exports = {
  searchBySubject,
};
