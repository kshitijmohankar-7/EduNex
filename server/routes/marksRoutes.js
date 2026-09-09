const express = require('express');

const router = express.Router();

const authenticate =
  require('../middleware/auth');

const authorize =
  require('../middleware/roleCheck');

const {
  searchStudents,
  getStudentForMarks,
  getStudentSubjects,
  getStudentMarksForExam,
  saveBulkMarks,
  publishMarks,
  getStudentMarks,
} =
  require('../controllers/marksController');


// ======================================================
// FACULTY - SEARCH STUDENTS
// ======================================================

// GET /api/marks/students/search?search=kshitij

router.get(
  '/students/search',
  authenticate,
  authorize('faculty'),
  searchStudents
);


// ======================================================
// FACULTY - GET STUDENT
// ======================================================

// GET /api/marks/student/:studentId

router.get(
  '/student/:studentId',
  authenticate,
  authorize('faculty'),
  getStudentForMarks
);


// ======================================================
// FACULTY - GET ENROLLED SUBJECTS
// ======================================================

// GET /api/marks/student/:studentId/subjects

router.get(
  '/student/:studentId/subjects',
  authenticate,
  authorize('faculty'),
  getStudentSubjects
);


// ======================================================
// FACULTY - GET EXISTING MARKS
// ======================================================

// GET
// /api/marks/student/:studentId/marks?examType=CT1

router.get(
  '/student/:studentId/marks',
  authenticate,
  authorize('faculty'),
  getStudentMarksForExam
);


// ======================================================
// FACULTY - SAVE ALL MARKS
// ======================================================

// POST /api/marks/bulk

router.post(
  '/bulk',
  authenticate,
  authorize('faculty'),
  saveBulkMarks
);


// ======================================================
// FACULTY - PUBLISH MARK
// ======================================================

// PUT /api/marks/:markId/publish

router.put(
  '/:markId/publish',
  authenticate,
  authorize('faculty'),
  publishMarks
);


// ======================================================
// STUDENT - GET OWN PUBLISHED MARKS
// ======================================================

// GET /api/marks/student

router.get(
  '/student',
  authenticate,
  authorize('student'),
  getStudentMarks
);


module.exports = router;