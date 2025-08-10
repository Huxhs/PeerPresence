// server/controllers/conversationController.js
const Conversation = require('../models/Conversation'); // make sure this file exists

// POST /api/conversations
exports.createConversation = async (req, res) => {
  try {
    const { userA, userB } = req.body; // user ids
    if (!userA || !userB) return res.status(400).json({ message: 'userA and userB required' });

    // ensure one per pair
    const existing = await Conversation.findOne({
      participants: { $all: [userA, userB], $size: 2 },
      archivedBy: { $ne: userA }, // if you added soft-archive
    });

    if (existing) return res.status(200).json(existing);

    const convo = await Conversation.create({ participants: [userA, userB] });
    res.status(201).json(convo);
  } catch (err) {
    console.error('createConversation error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/conversations?userId=...
exports.getUserConversations = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ message: 'userId required' });

    const list = await Conversation.find({ participants: userId }).sort({ updatedAt: -1 });
    res.json(list);
  } catch (err) {
    console.error('getUserConversations error', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/conversations/:id  (soft delete for a user)
exports.softDeleteConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body; // who is archiving
    if (!userId) return res.status(400).json({ message: 'userId required' });

    const updated = await Conversation.findByIdAndUpdate(
      id,
      { $addToSet: { archivedBy: userId } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ message: 'Conversation not found' });

    res.json({ ok: true });
  } catch (err) {
    console.error('softDeleteConversation error', err);
    res.status(500).json({ message: 'Server error' });
  }
};
