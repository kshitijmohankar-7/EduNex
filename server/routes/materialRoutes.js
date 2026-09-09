const express = require('express');
const path = require('path');
const multer = require('multer');

const router = express.Router();

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const {
  getMaterials,
  createMaterial,
} = require('../controllers/materialController');


// Upload directory
const uploadDirectory = path.join(
  __dirname,
  '../../uploads/study-material'
);


// Multer storage
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


// Allowed file types
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


// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});


// STUDENT
// View study materials
router.get(
  '/',
  authenticate,
  authorize('student'),
  getMaterials
);


// FACULTY
// Upload study material
router.post(
  '/',
  authenticate,
  authorize('faculty'),
  upload.single('file'),
  createMaterial
);


module.exports = router;