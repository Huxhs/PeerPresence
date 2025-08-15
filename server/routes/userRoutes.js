const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { getMe, updateMe, updatePassword, deleteMe } = require('../controllers/userController');
const requireAuth = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);
router.patch('/password', protect, updatePassword);
router.delete('/me', protect, deleteMe);
router.get('/subjects', requireAuth, userController.getMySubjects);

module.exports = router;
