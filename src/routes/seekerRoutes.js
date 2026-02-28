const express = require('express');
const router = express.Router();
const { toggleHotStatus } = require('../controllers/seekerController');
const { authenticate } = require('../middleware/auth');

router.patch('/status', authenticate, toggleHotStatus);

module.exports = router;