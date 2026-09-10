const express = require('express');
const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const {
  listAnnouncements,
  createAnnouncement,
} = require('../controllers/announcementController');

router.use(authenticate);

router.get('/', authorize('student', 'faculty', 'admin'), listAnnouncements);
router.post('/', authorize('faculty', 'admin'), createAnnouncement);

module.exports = router;
