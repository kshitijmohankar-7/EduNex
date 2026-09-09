require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');

const assignmentSubmissionRoutes = require('./routes/assignmentSubmissionRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const aiRoutes = require('./routes/aiRoutes');
const materialRoutes = require('./routes/materialRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const marksRoutes = require('./routes/marksRoutes');

const errorHandler = require('./middleware/errorHandler');

const app = express();


// ======================================================
// CORS
// ======================================================

app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
  })
);


// ======================================================
// BODY PARSING
// ======================================================

app.use(express.json({ limit: '100mb' }));

app.use(
  express.urlencoded({
    limit: '100mb',
    extended: true,
  })
);


// ======================================================
// STATIC UPLOAD FILES
// ======================================================

// Files inside:
// edunex/uploads/
//
// are available through:
// http://localhost:5000/uploads/...

app.use(
  '/uploads',
  express.static(
    path.join(__dirname, '..', 'uploads')
  )
);


// ======================================================
// HEALTH CHECK
// ======================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
  });
});


// ======================================================
// AUTHENTICATION
// ======================================================

app.use(
  '/api/auth',
  authRoutes
);


// ======================================================
// STUDENT
// ======================================================

app.use(
  '/api/students',
  studentRoutes
);


// ======================================================
// STUDENT ATTENDANCE
// ======================================================

app.use(
  '/api/attendance',
  attendanceRoutes
);


// ======================================================
// STUDENT ACHIEVEMENTS
// ======================================================

app.use(
  '/api/students/achievements',
  achievementRoutes
);


// ======================================================
// FACULTY
// ======================================================

app.use(
  '/api/faculty',
  facultyRoutes
);


// ======================================================
// ASSIGNMENT SUBMISSIONS
// ======================================================

app.use(
  '/api/assignment-submissions',
  assignmentSubmissionRoutes
);


// ======================================================
// MARKS
// ======================================================

// Faculty:
// GET  /api/marks/students?subjectId=1
// POST /api/marks
//
// This route is registered ONLY ONCE.

app.use(
  '/api/marks',
  marksRoutes
);


// ======================================================
// AI
// ======================================================

app.use(
  '/api/ai',
  aiRoutes
);


// ======================================================
// SUBJECTS
// ======================================================

app.use(
  '/api/subjects',
  subjectRoutes
);


// ======================================================
// STUDY MATERIALS
// ======================================================

app.use(
  '/api/materials',
  materialRoutes
);


// ======================================================
// ASSIGNMENTS
// ======================================================

// Student:
// GET /api/assignments
//
// Faculty:
// POST /api/assignments

app.use(
  '/api/assignments',
  assignmentRoutes
);


// ======================================================
// ERROR HANDLER
// ======================================================

app.use(errorHandler);


// ======================================================
// START SERVER
// ======================================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`EduNex API listening on port ${PORT}`);
});


module.exports = app;