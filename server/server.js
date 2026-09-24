require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const facultyRoutes = require('./routes/facultyRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const assignmentSubmissionRoutes = require('./routes/assignmentSubmissionRoutes');
const assignmentGradeRoutes = require('./routes/assignmentGradeRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const aiRoutes = require('./routes/aiRoutes');
const materialRoutes = require('./routes/materialRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const marksRoutes = require('./routes/marksRoutes');
const marksheetRoutes = require('./routes/marksheetRoutes');
const adminRoutes = require('./routes/adminRoutes');
const questionBankRoutes = require('./routes/questionBankRoutes');
const academicMetricsRoutes = require('./routes/academicMetricsRoutes');
const academicInsightRoutes = require('./routes/academicInsightRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const phase3Routes = require('./routes/phase3Routes');
const timetableRoutes = require('./routes/timetableRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const platformRoutes = require('./routes/platformRoutes');
const examScheduleRoutes = require('./routes/examScheduleRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (isProduction) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Keep JSON bodies bounded in production. Multipart uploads are handled by route-level Multer limits.
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '2mb' }));
app.use(express.urlencoded({ limit: process.env.URLENCODED_BODY_LIMIT || '2mb', extended: true }));

const uploadsRoot = path.resolve(process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads'));
const submissionsDir = path.join(uploadsRoot, 'assignment-submissions');
const legacyAssignmentsDir = path.join(uploadsRoot, 'assignments');

app.use('/uploads/assignment-submissions/:filename', (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const current = path.join(submissionsDir, filename);
  if (fs.existsSync(current)) return res.sendFile(current);
  const legacy = path.join(legacyAssignmentsDir, filename);
  if (fs.existsSync(legacy)) return res.sendFile(legacy);
  return next();
});
app.use('/uploads', express.static(uploadsRoot, {
  index: false,
  maxAge: isProduction ? '1d' : 0,
  immutable: false,
}));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'edunex-api', environment: process.env.NODE_ENV || 'development' });
});

app.get('/api/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ready', database: 'ok' });
  } catch (error) {
    console.error('Readiness check failed:', error.message);
    res.status(503).json({ status: 'not_ready', database: 'unavailable' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/students/academic-metrics', academicMetricsRoutes);
app.use('/api/students/academic-insights', academicInsightRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', phase3Routes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/students/achievements', achievementRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/assignment-submissions', assignmentSubmissionRoutes);
app.use('/api/assignment-grades', assignmentGradeRoutes);
app.use('/api/marks', marksRoutes);
app.use('/api/marksheets', marksheetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/question-banks', questionBankRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/platform', platformRoutes);
app.use('/api/exam-schedule', examScheduleRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', requestId: req.requestId });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5000);
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`EduNex API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await pool.end();
    } finally {
      process.exit(0);
    }
  });
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
