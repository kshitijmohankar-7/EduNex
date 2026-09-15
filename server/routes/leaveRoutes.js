const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const controller = require('../controllers/leaveController');

router.get('/faculty-options', authenticate, authorize('student'), controller.getFacultyOptions);
router.get('/student', authenticate, authorize('student'), controller.getStudentLeaveRequests);
router.post('/', authenticate, authorize('student'), controller.createLeaveRequest);
router.get('/faculty', authenticate, authorize('faculty'), controller.getFacultyLeaveRequests);
router.patch('/:requestId', authenticate, authorize('faculty'), controller.reviewLeaveRequest);

module.exports = router;
