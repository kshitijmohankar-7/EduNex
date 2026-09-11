require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

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

const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/students/academic-metrics', academicMetricsRoutes);
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

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`EduNex API listening on port ${PORT}`));

module.exports = app;
