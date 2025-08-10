// server/controllers/messageController.js
const Message = require('../models/Message');         // make sure this model exists
const Conversation = require('../models/Conversation'); // we created this earlier

// POST /api/messages  -> create a DM and upsert the conversation's last activity
exports.createMessage = async (req, res) => {
  try {
    const { conversationId, sender, recipient, content } = req.body;
    if (!sender || !recipient || !content) {
      return res.status(400).json({ message: 'sender, recipient, and content are required' });
    }

    let convo = null;

    if (conversationId) {
      convo = await Conversation.findById(conversationId);
      if (!convo) return res.status(404).json({ message: 'Conversation not found' });
    } else {
      // find-or-create one-to-one conversation
      convo = await Conversation.findOne({
        participants: { $all: [sender, recipient], $size: 2 },
      });
      if (!convo) {
        convo = await Conversation.create({ participants: [sender, recipient] });
      }
    }

    const msg = await Message.create({
      conversation: convo._id,
      sender,
      recipient,
      content,
    });

    // bump convo updatedAt
    await Conversation.findByIdAndUpdate(convo._id, { $set: { updatedAt: new Date() } });

    res.status(201).json(msg);
  } catch (err) {
    console.error('createMessage error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/messages/:conversationId  -> fetch messages in a convo (newest last)
exports.getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const items = await Message.find({ conversation: conversationId }).sort({ createdAt: 1 });
    res.json(items);
  } catch (err) {
    console.error('getConversationMessages error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};
