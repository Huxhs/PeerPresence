// server/routes/conversationRoutes.js
const express = require('express');
const router = express.Router();

const {
  createConversation,
  getUserConversations,
  softDeleteConversation,
} = require('../controllers/conversationController'); // <-- must point to file above

router.post('/', createConversation);          // ✅ handler is a function
router.get('/', getUserConversations);         // ✅
router.delete('/:id', softDeleteConversation); // ✅

module.exports = router; // ✅ export the router itself
