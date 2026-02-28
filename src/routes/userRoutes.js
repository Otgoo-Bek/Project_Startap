const express = require('express');
const router = express.Router();
const { syncUser } = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.post('/sync', authenticate, syncUser);

module.exports = router;