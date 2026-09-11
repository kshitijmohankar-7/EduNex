const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const authenticate = require('../middleware/auth');
const authorize = require('../middleware/roleCheck');
const controller = require('../controllers/questionBankController');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '../../uploads/question-banks');
if (!fs.existsSync(uploadDirectory)) fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDirectory),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`),
});
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only PDF, DOC and DOCX files are allowed.'), allowed.includes(file.mimetype));
  },
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authenticate);
router.get('/', authorize('student', 'faculty'), controller.listQuestionBanks);
router.post('/', authorize('faculty'), upload.single('file'), controller.createQuestionBank);
router.delete('/:id', authorize('faculty'), controller.deleteQuestionBank);

module.exports = router;
