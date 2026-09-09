const express = require('express');

const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const {
  getStudentsForAttendance,
  markAttendance,
  getStudentAttendance,
  getStudentAttendanceSummary,
} = require('../controllers/attendanceController');


// ======================================================
// FACULTY
// Get students for a subject
// ======================================================

router.get(
  '/students',
  authenticate,
  authorize('faculty'),
  getStudentsForAttendance
);


// ======================================================
// FACULTY
// Mark / update attendance
// ======================================================

router.post(
  '/',
  authenticate,
  authorize('faculty'),
  markAttendance
);


// ======================================================
// STUDENT
// Get attendance history
// ======================================================

router.get(
  '/student',
  authenticate,
  authorize('student'),
  getStudentAttendance
);


// ======================================================
// STUDENT
// Get attendance summary
// ======================================================

router.get(
  '/summary',
  authenticate,
  authorize('student'),
  getStudentAttendanceSummary
);


module.exports = router;