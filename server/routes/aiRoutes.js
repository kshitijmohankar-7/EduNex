const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { chat } = require('../controllers/aiController');

router.use(authenticate);
router.post('/chat', chat);

module.exports = router;
