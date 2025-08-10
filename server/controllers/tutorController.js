const Tutor = require('../models/Tutor');

// GET /api/tutors
exports.listTutors = async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    let filter = {};
    if (q) {
      filter = {
        $or: [
          { name: { $regex: q, $options: 'i' } },
          { subjects: { $elemMatch: { $regex: q, $options: 'i' } } },
        ],
      };
    }
    const tutors = await Tutor.find(filter).sort({ createdAt: -1 });
    res.json(tutors);
  } catch (err) {
    console.error('Tutor list error:', err);
    res.status(500).json({ message: 'Server error fetching tutors' });
  }
};
