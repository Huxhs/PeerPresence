require('dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('mongoose');
const Tutor = require('../models/Tutor');

const uri = process.env.MONGO_URI;

const seed = [
  {
    name: 'Ava Thompson',
    email: 'ava.thompson@example.com',
    avatar: 'https://i.pravatar.cc/120?img=15',
    bio: 'CS undergrad & algorithms enthusiast. I love teaching data structures.',
    subjects: ['Data Structures', 'Algorithms', 'JavaScript'],
    rating: 4.8, reviewsCount: 27
  },
  {
    name: 'Marcus Lee',
    email: 'marcus.lee@example.com',
    avatar: 'https://i.pravatar.cc/120?img=22',
    bio: 'Math grad student focused on calculus and linear algebra.',
    subjects: ['Calculus', 'Linear Algebra', 'Pre-Calculus'],
    rating: 4.6, reviewsCount: 19
  },
  {
    name: 'Priya Patel',
    email: 'priya.patel@example.com',
    avatar: 'https://i.pravatar.cc/120?img=47',
    bio: 'Chemistry TA with a passion for making tough topics click.',
    subjects: ['Organic Chemistry I', 'General Chemistry', 'Biochemistry'],
    rating: 4.9, reviewsCount: 33
  },
  {
    name: 'Diego Ramirez',
    email: 'diego.ramirez@example.com',
    avatar: 'https://i.pravatar.cc/120?img=10',
    bio: 'Full‑stack dev; I mentor JS/React newbies into confident builders.',
    subjects: ['React', 'Node.js', 'Web Fundamentals'],
    rating: 4.7, reviewsCount: 21
  },
  {
    name: 'Sophia Nguyen',
    email: 'sophia.nguyen@example.com',
    avatar: 'https://i.pravatar.cc/120?img=8',
    bio: 'Physics tutor who loves breaking concepts into bite‑size intuitions.',
    subjects: ['Physics I', 'Mechanics', 'Electromagnetism'],
    rating: 4.8, reviewsCount: 25
  }
];

(async () => {
  try {
    await mongoose.connect(uri);
    console.log('Mongo connected');

    // Upsert by email so running the script twice won’t duplicate
    for (const t of seed) {
      await Tutor.findOneAndUpdate({ email: t.email }, t, { upsert: true, new: true, setDefaultsOnInsert: true });
    }

    const count = await Tutor.countDocuments();
    console.log(`Seed complete. Tutor count: ${count}`);
  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
})();
