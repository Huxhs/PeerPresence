// server/routes/accountRoutes.js
const router = require('express').Router();
const auth = require('../middleware/auth');
const account = require('../controllers/accountController');

router.get('/me', auth, account.getMe);
router.get('/subjects', auth, account.getMySubjects); // <— ADD THIS

module.exports = router;
