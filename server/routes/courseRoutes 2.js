const express = require('express');
const router = express.Router();
const Course = require('../models/Course');

// GET /api/courses  -> list all courses
router.get('/', async (_req, res) => {
  try {
    const courses = await Course.find().sort({ title: 1 });
    res.json(courses);
  } catch (err) {
    console.error('Fetch courses error:', err);
    res.status(500).json({ message: 'Server error while fetching courses' });
  }
});

// POST /api/courses/seed  -> seed 3 mock courses (only if empty)
router.post('/seed', async (_req, res) => {
  try {
    const count = await Course.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Courses already seeded' });
    }

    const seeded = await Course.insertMany([
      {
        title: 'Intro to Calculus',
        imageUrl: 'https://picsum.photos/seed/calculus/80/80',
        description: 'Limits, derivatives, integrals, and applications.',
      },
      {
        title: 'Data Structures',
        imageUrl: 'https://picsum.photos/seed/datastructures/80/80',
        description: 'Arrays, stacks, queues, trees, graphs, and complexity.',
      },
      {
        title: 'Organic Chemistry I',
        imageUrl: 'https://picsum.photos/seed/ochem/80/80',
        description: 'Structure, bonding, and fundamental reactions.',
      },
    ]);

    res.status(201).json({ message: 'Seeded courses', count: seeded.length, courses: seeded });
  } catch (err) {
    console.error('Seed courses error:', err);
    res.status(500).json({ message: 'Server error while seeding courses' });
  }
});

module.exports = router;
