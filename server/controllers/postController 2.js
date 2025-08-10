const Post = require('../models/Post');
const User = require('../models/User');

// GET /api/posts
exports.list = async (req, res) => {
  const me = req.user; // full mongoose doc from your middleware
  const posts = await Post.find().sort({ createdAt: -1 }).lean();

  const savedSet = new Set((me.savedPosts || []).map(id => String(id)));

  const withMeta = posts.map(p => {
    const score = (p.votes || []).reduce((s, v) => s + v.value, 0);
    const myVote =
      (p.votes || []).find(v => String(v.user) === String(me._id))?.value || 0;
    const saved = savedSet.has(String(p._id));
    return { ...p, score, myVote, saved };
  });

  res.json(withMeta);
};

// POST /api/posts   (handy for manual adds/dev tools)
exports.create = async (req, res) => {
  const { title, description, imageUrl } = req.body;
  const author = req.user?._id || null;
  const post = await Post.create({ title, description, imageUrl, author, votes: [] });
  res.status(201).json(post);
};

// PATCH /api/posts/:id/vote  { value: 1 | -1 }
exports.vote = async (req, res) => {
  const userId = req.user._id;
  const { id } = req.params;
  const { value } = req.body;

  if (![1, -1].includes(value)) {
    return res.status(400).json({ message: 'value must be 1 or -1' });
  }

  const post = await Post.findById(id);
  if (!post) return res.status(404).json({ message: 'Post not found' });

  const idx = post.votes.findIndex(v => String(v.user) === String(userId));
  if (idx === -1) {
    post.votes.push({ user: userId, value });
  } else if (post.votes[idx].value === value) {
    // toggle off
    post.votes.splice(idx, 1);
  } else {
    post.votes[idx].value = value;
  }

  await post.save();

  const score = post.votes.reduce((s, v) => s + v.value, 0);
  const myVote = post.votes.find(v => String(v.user) === String(userId))?.value || 0;

  res.json({ id: post.id, score, myVote });
};

// POST /api/posts/:id/toggle-save
exports.toggleSave = async (req, res) => {
  const me = await User.findById(req.user._id);
  if (!me) return res.status(404).json({ message: 'User not found' });

  const { id } = req.params;
  const has = me.savedPosts.some(p => String(p) === String(id));
  if (has) me.savedPosts.pull(id);
  else me.savedPosts.push(id);

  await me.save();
  res.json({ saved: !has });
};

// DEV: POST /api/posts/seed/sample  (one‑time helper)
exports.seed = async (_req, res) => {
  const count = await Post.countDocuments();
  if (count) return res.json({ ok: true, message: 'Posts already exist' });

  const sample = [
    {
      title: 'Study Jam: Data Structures',
      description: 'Peer session on stacks, queues, trees this Friday. Bring questions!',
      imageUrl: 'https://picsum.photos/seed/ds/800/450',
    },
    {
      title: 'Calc Crash Course',
      description: 'Limits, derivatives, integrals—mini series next week.',
      imageUrl: 'https://picsum.photos/seed/calc/800/450',
    },
    {
      title: 'Organic Chem Tips',
      description: 'Aromaticity, mechanisms and memorization strategies.',
      imageUrl: 'https://picsum.photos/seed/ochem/800/450',
    },
  ];

  await Post.insertMany(sample);
  res.json({ ok: true, inserted: sample.length });
  // Get posts the current user has favorited
exports.getSavedPosts = async (req, res) => {
  try {
    const userId = req.user._id;
    const posts = await Post.find({ favorites: userId })
      .sort({ createdAt: -1 });

    res.json(
      posts.map(p => ({
        _id: p._id,
        title: p.title,
        description: p.description,
        imageUrl: p.imageUrl,
        likes: p.likes,
        dislikes: p.dislikes,
        favorites: p.favorites,   // array of user ids
        createdBy: p.createdBy,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      }))
    );
  } catch (e) {
    console.error('getSavedPosts error', e);
    res.status(500).json({ message: 'Failed to load saved posts' });
  }
};

};
