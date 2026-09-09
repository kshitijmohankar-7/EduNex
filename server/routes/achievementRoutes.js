const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const { listAchievements, addAchievement } = require('../controllers/achievementController');

router.use(authenticate, authorize('student'));
router.get('/', listAchievements);
router.post('/', addAchievement);

module.exports = router;
