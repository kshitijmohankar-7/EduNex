// Bridges chat requests from the frontend to the Python AI microservice.
// The Node layer is responsible for attaching ONLY data the current user is authorized to see.
const pool = require('../config/db');
const { getStudentByUserId } = require('./studentController');

async function buildAuthorizedContext(user) {
  if (user.role === 'student') {
    const student = await getStudentByUserId(user.id);
    if (!student) return {};

    const [marks, attendance, assignments] = await Promise.all([
      pool.query(
        `SELECT sub.name AS subject, m.exam_type, m.obtained_marks, m.max_marks
         FROM marks m
         JOIN subjects sub ON sub.id = m.subject_id
         WHERE m.student_id = $1 AND m.published = TRUE
         ORDER BY sub.name, m.exam_type`,
        [student.id]
      ),
      pool.query(
        `SELECT sub.name AS subject,
                COUNT(*) FILTER (WHERE a.status = 'present') AS present,
                COUNT(*) AS total
         FROM attendance a
         JOIN subjects sub ON sub.id = a.subject_id
         WHERE a.student_id = $1
         GROUP BY sub.name
         ORDER BY sub.name`,
        [student.id]
      ),
      pool.query(
        `SELECT a.title,
                sub.name AS subject,
                a.deadline,
                COALESCE(s.status, 'not_submitted') AS submission_status,
                s.submitted_at
         FROM assignments a
         JOIN subjects sub ON sub.id = a.subject_id
         JOIN student_subjects ss
           ON ss.student_id = $1
          AND ss.subject_id = a.subject_id
          AND ss.status = 'approved'
         LEFT JOIN assignment_submissions s
           ON s.assignment_id = a.id
          AND s.student_id = $1
         ORDER BY a.deadline NULLS LAST, a.id DESC`,
        [student.id]
      ),
    ]);

    return {
      role: 'student',
      studentId: student.id,
      marks: marks.rows,
      attendance: attendance.rows,
      assignments: assignments.rows,
    };
  }

  return { role: user.role };
}

// POST /api/ai/chat  body: { message: string }
async function chat(req, res, next) {
  try {
    const { message } = req.body;
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const context = await buildAuthorizedContext(req.user);
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    const response = await fetch(`${aiServiceUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(message).trim(), context }),
    });

    if (!response.ok) {
      return res.status(502).json({ error: 'AI service is currently unavailable' });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { chat };
