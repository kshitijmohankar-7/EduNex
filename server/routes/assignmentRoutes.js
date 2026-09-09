const express = require('express');
const path = require('path');
const multer = require('multer');

const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const {
  getAssignments,
  getFacultyAssignments,
  createAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  approveAssignmentSubmission,
  rejectAssignmentSubmission
} = require('../controllers/assignmentController');

// ======================================================
// UPLOAD DIRECTORY
// ======================================================

const uploadDirectory = path.join(
  __dirname,
  '../../uploads/assignments'
);


// ======================================================
// MULTER STORAGE
// ======================================================

const storage = multer.diskStorage({

  destination: function (req, file, cb) {
    cb(null, uploadDirectory);
  },

  filename: function (req, file, cb) {

    const uniqueName =
      `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;

    cb(null, uniqueName);
  }

});


// ======================================================
// FILE FILTER
// ======================================================

const fileFilter = function (req, file, cb) {

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  if (allowedTypes.includes(file.mimetype)) {

    cb(null, true);

  } else {

    cb(
      new Error('Only PDF, DOC and DOCX files are allowed.'),
      false
    );

  }

};


// ======================================================
// MULTER
// ======================================================

const upload = multer({

  storage,

  fileFilter,

  limits: {
    fileSize: 10 * 1024 * 1024
  }

});


// ======================================================
// STUDENT
// GET ASSIGNMENTS
// ======================================================

router.get(
  '/',
  authenticate,
  authorize('student'),
  getAssignments
);

// ======================================================
// FACULTY
// GET OWN ASSIGNMENTS
// ======================================================

router.get(
  '/faculty',
  authenticate,
  authorize('faculty'),
  getFacultyAssignments
);

// ======================================================
// FACULTY
// CREATE ASSIGNMENT
// ======================================================

router.post(
  '/',
  authenticate,
  authorize('faculty'),
  upload.single('file'),
  createAssignment
);


// ======================================================
// STUDENT
// SUBMIT ASSIGNMENT
// ======================================================

router.post(
  '/:assignmentId/submit',
  authenticate,
  authorize('student'),
  upload.single('file'),
  submitAssignment
);


// ======================================================
// FACULTY
// GET SUBMISSIONS
// ======================================================

router.get(
  '/:assignmentId/submissions',
  authenticate,
  authorize('faculty'),
  getAssignmentSubmissions
);


// ======================================================
// FACULTY
// APPROVE SUBMISSION
// ======================================================

router.put(
  '/submissions/:submissionId/approve',
  authenticate,
  authorize('faculty'),
  approveAssignmentSubmission
);


// ======================================================
// FACULTY
// REJECT SUBMISSION
// ======================================================

router.put(
  '/submissions/:submissionId/reject',
  authenticate,
  authorize('faculty'),
  rejectAssignmentSubmission
);
module.exports = router;