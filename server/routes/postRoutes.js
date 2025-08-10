// server/routes/postRoutes.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Post = require('../models/Post');
const User = require('../models/User');
const protect = require('../middleware/authMiddleware');

// GET /api/posts  — list all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 }).lean();
    res.json(posts);
  } catch (e) {
    res.status(500).json({ message: 'Failed to fetch posts' });
  }
});

// PATCH /api/posts/:id/like  — toggle like (simple +1 / -1 from client)
router.patch('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    const liked = req.body.liked === true;
    post.likes += liked ? 1 : -1;
    if (post.likes < 0) post.likes = 0;

    await post.save();
    res.json({ likes: post.likes });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update like' });
  }
});

// PATCH /api/posts/:id/dislike — toggle dislike
router.patch('/:id/dislike', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Not found' });

    const disliked = req.body.disliked === true;
    post.dislikes += disliked ? 1 : -1;
    if (post.dislikes < 0) post.dislikes = 0;

    await post.save();
    res.json({ dislikes: post.dislikes });
  } catch (e) {
    res.status(500).json({ message: 'Failed to update dislike' });
  }
});

// PATCH /api/posts/:id/favorite — atomic toggle save/unsave
router.patch('/:id/favorite', protect, async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.user._id;

    // check if already saved
    const already = await Post.exists({ _id: postId, favorites: userId });

    if (already) {
      await Post.updateOne({ _id: postId }, { $pull: { favorites: userId } });
    } else {
      await Post.updateOne({ _id: postId }, { $addToSet: { favorites: userId } });
    }

    const updated = await Post.findById(postId).select('favorites').lean();
    res.json({
      saved: !already,
      favoritesCount: updated?.favorites?.length || 0,
    });
  } catch (e) {
    res.status(500).json({ message: 'Failed to toggle favorite' });
  }
});

// GET /api/posts/saved — posts the current user has saved
router.get('/saved', protect, async (req, res) => {
  try {
    const posts = await Post.find({ favorites: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.json(posts);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load saved posts' });
  }
});

/* ---------- Dev-only seeding (optional) ---------- */
router.post('/seed/sample', async (req, res) => {
  try {
    const users = await User.find().limit(3).lean();
    const [u1, u2, u3] = users;

    const docs = [
      {
        title: 'Top 10 Study Tips for Finals Week',
        description:
          'Boost your grades with these proven strategies for planning, active recall, and spaced repetition.',
        imageUrl: 'https://picsum.photos/seed/study/600/400',
        likes: 12,
        dislikes: 2,
        favorites: [],
        createdBy: u1 ? new mongoose.Types.ObjectId(u1._id) : undefined,
      },
      {
        title: '5 Easy Healthy Meals for Busy Students',
        description:
          'Quick and nutritious recipes you can make between classes.',
        imageUrl: 'https://picsum.photos/seed/healthy/600/400',
        likes: 8,
        dislikes: 1,
        favorites: [],
        createdBy: u2 ? new mongoose.Types.ObjectId(u2._id) : undefined,
      },
      {
        title: 'Mastering Time Management',
        description:
          'Balance classes, studying, and social life with these time tips.',
        imageUrl: 'https://picsum.photos/seed/timemanagement/600/400',
        likes: 15,
        dislikes: 0,
        favorites: [],
        createdBy: u3 ? new mongoose.Types.ObjectId(u3._id) : undefined,
      },
    ];

    await Post.deleteMany({});
    const out = await Post.insertMany(docs);
    res.json({ inserted: out.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Seeding failed' });
  }
});

module.exports = router;
