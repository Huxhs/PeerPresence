const express = require('express');
const router = express.Router();
const { listTutors } = require('../controllers/tutorController');

// Public for now
router.get('/', listTutors);

module.exports = router;
