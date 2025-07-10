const express = require('express');
const router = express.Router();
const { getSubjects } = require('../controllers/subjectController');

// @route   GET /api/subjects
// @desc    Get all available subjects
router.get('/', getSubjects);

module.exports = router;
