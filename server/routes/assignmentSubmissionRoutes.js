const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const {
  submitAssignment,
  getAssignmentSubmissions,
  approveAssignmentSubmission,
  rejectAssignmentSubmission,
  getStudentSubmission,
} = require('../controllers/assignmentSubmissionController');


// ======================================================
// UPLOAD DIRECTORY
// ======================================================


const uploadDirectory = path.join(
  __dirname,
  '../../uploads/assignment-submissions'
);

// Create upload directory if it does not exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });
}

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
  },

});


// ======================================================
// FILE FILTER
// ======================================================

const fileFilter = function (req, file, cb) {

  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
    fileSize: 10 * 1024 * 1024,
  },

});


// ======================================================
// STUDENT
// SUBMIT ASSIGNMENT
// ======================================================

router.post(
  '/:assignmentId',
  authenticate,
  authorize('student'),
  upload.single('file'),
  submitAssignment
);


// ======================================================
// STUDENT
// GET OWN SUBMISSION
// ======================================================

router.get(
  '/student/:assignmentId',
  authenticate,
  authorize('student'),
  getStudentSubmission
);


// ======================================================
// FACULTY
// GET ALL SUBMISSIONS
// ======================================================

router.get(
  '/:assignmentId',
  authenticate,
  authorize('faculty'),
  getAssignmentSubmissions
);


// ======================================================
// FACULTY
// APPROVE SUBMISSION
// ======================================================

router.put(
  '/:submissionId/approve',
  authenticate,
  authorize('faculty'),
  approveAssignmentSubmission
);


// ======================================================
// FACULTY
// REJECT SUBMISSION
// ======================================================

router.put(
  '/:submissionId/reject',
  authenticate,
  authorize('faculty'),
  rejectAssignmentSubmission
);


module.exports = router;