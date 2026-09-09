const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');

const {
  searchStudentsForMarksheet,
  uploadMarksheet,
  getFacultyMarksheets,
  deleteMarksheet,
  getStudentMarksheets,
} = require('../controllers/marksheetController');

const router = express.Router();

const uploadDirectory = path.join(__dirname, '../../uploads/marksheets');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => {
    const safeExtension = path.extname(file.originalname).toLowerCase() || '.pdf';
    const uniqueName = `marksheet-${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExtension}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      return cb(null, true);
    }
    return cb(new Error('Only PDF marksheets are allowed.'));
  },
  limits: { fileSize: 15 * 1024 * 1024 },
});

router.get('/faculty/students/search', authenticate, authorize('faculty'), searchStudentsForMarksheet);
router.get('/faculty', authenticate, authorize('faculty'), getFacultyMarksheets);
router.post('/faculty/upload', authenticate, authorize('faculty'), upload.single('marksheet'), uploadMarksheet);
router.delete('/faculty/:id', authenticate, authorize('faculty'), deleteMarksheet);
router.get('/student', authenticate, authorize('student'), getStudentMarksheets);

module.exports = router;
