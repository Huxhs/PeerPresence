const Course = require('../models/Course');

exports.listCourses = async (_req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: 1 });
    res.json(courses);
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ message: 'Failed to fetch courses' });
  }
};

exports.seedMockCourses = async (_req, res) => {
  try {
    const count = await Course.countDocuments();
    if (count > 0) return res.json({ ok: true, message: 'Courses already exist' });

    await Course.create([
      {
        title: 'Intro to Calculus',
        description: 'Limits, derivatives, integrals, and applications.',
        imageUrl: 'https://picsum.photos/seed/calculus/80/80',
      },
      {
        title: 'Data Structures',
        description: 'Arrays, stacks, queues, trees, graphs, and complexity.',
        imageUrl: 'https://picsum.photos/seed/datastructures/80/80',
      },
      {
        title: 'Organic Chemistry I',
        description: 'Structure, bonding, and fundamental reactions.',
        imageUrl: 'https://picsum.photos/seed/ochem/80/80',
      },
    ]);

    res.json({ ok: true });
  } catch (err) {
    console.error('Seed courses error:', err);
    res.status(500).json({ ok: false, message: 'Failed to seed courses' });
  }
};
