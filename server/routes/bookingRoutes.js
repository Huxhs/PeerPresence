// server/routes/bookingRoutes.js
const express = require('express');
const router = express.Router();

const auth = require('../middleware/auth');              // <-- fixed
const bookingController = require('../controllers/bookingController');

// Confirm a booking
router.post('/confirm', auth, bookingController.confirm);

// Reschedule a booking
router.patch('/:id', auth, bookingController.reschedule);

// Cancel a booking
router.delete('/:id', auth, bookingController.cancel);

module.exports = router;
