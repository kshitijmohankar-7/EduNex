const express = require('express');

const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const {
  getAssignedStudents,
  markAttendance,
  enterMarks,
  publishMarks,
  getSubjectChoices,
  approveSubjectChoice,
  rejectSubjectChoice,
} = require('../controllers/facultyController');

const {
  searchStudents,
  getStudentDetails,
} = require('../controllers/facultyStudentController');

// ======================================================
// FACULTY AUTHENTICATION
// ======================================================
router.use(
  authenticate,
  authorize('faculty', 'admin')
);

// ======================================================
// STUDENT DETAILS
// ======================================================
router.get('/student-details/search', searchStudents);
router.get('/student-details/:studentId', getStudentDetails);

// ======================================================
// STUDENTS
// ======================================================
router.get('/students', getAssignedStudents);

// ======================================================
// ATTENDANCE
// ======================================================
router.post('/attendance', markAttendance);

// ======================================================
// MARKS
// ======================================================
router.post('/marks', enterMarks);
router.post('/marks/publish', publishMarks);

// ======================================================
// SUBJECT CHOICE REQUESTS
// ======================================================
router.get('/subject-choices', getSubjectChoices);
router.post('/subject-choices/:choiceId/approve', approveSubjectChoice);
router.post('/subject-choices/:choiceId/reject', rejectSubjectChoice);

module.exports = router;
