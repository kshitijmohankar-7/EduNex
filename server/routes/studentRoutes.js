const express = require('express');

const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const {
  getProfile,
  getAttendance,
  getMarks,
  getMarksheet,
  //getAchievements,

  // Electives
  getElectiveOptions,
  getElectiveChoice,
  submitElectiveChoice
} = require('../controllers/studentController');


// ======================================================
// STUDENT AUTHENTICATION
// ======================================================

router.use(
  authenticate,
  authorize('student')
);


// ======================================================
// PROFILE
// ======================================================

router.get(
  '/profile',
  getProfile
);


// ======================================================
// ATTENDANCE
// ======================================================

router.get(
  '/attendance',
  getAttendance
);


// ======================================================
// MARKS
// ======================================================

router.get(
  '/marks',
  getMarks
);


// ======================================================
// MARKSHEET
// ======================================================

router.get(
  '/marksheet',
  getMarksheet
);


// ======================================================
// ACHIEVEMENTS
// ======================================================

/*router.get(
  '/achievements',
  getAchievements
);*/


// ======================================================
// ELECTIVE OPTIONS
// ======================================================

// GET /api/students/electives
router.get(
  '/electives',
  getElectiveOptions
);


// ======================================================
// CURRENT ELECTIVE CHOICE
// ======================================================

// GET /api/students/electives/choice
router.get(
  '/electives/choice',
  getElectiveChoice
);


// ======================================================
// SUBMIT ELECTIVE CHOICE
// ======================================================

// POST /api/students/electives
router.post(
  '/electives',
  submitElectiveChoice
);


// ======================================================

module.exports = router;