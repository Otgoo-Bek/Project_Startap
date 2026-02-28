const express = require('express');
const router = express.Router();
const { getAllShifts, createShift } = require('../controllers/shiftController');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, getAllShifts);
router.post('/', authenticate, createShift);

module.exports = router;