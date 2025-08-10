// server/routes/messageRoutes.js
const express = require('express');
const router = express.Router();

const {
  createMessage,
  getConversationMessages,
} = require('../controllers/messageController');

router.post('/', createMessage);
router.get('/:conversationId', getConversationMessages);

module.exports = router;
