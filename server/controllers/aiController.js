// Bridges chat requests from the frontend to the Python AI microservice (ai-service/).
// The Node layer's job here is to attach ONLY data the current user is authorized to see —
// the AI service itself must never be trusted to fetch its own unrestricted data.
const pool = require('../config/db');
const { getStudentByUserId } = require('./studentController');

async function buildAuthorizedContext(user) {
  if (user.role === 'student') {
    const student = await getStudentByUserId(user.id);
    if (!student) return {};

    const [marks, attendance] = await Promise.all([
      pool.query(
        `SELECT sub.name AS subject, m.exam_type, m.obtained_marks, m.max_marks
         FROM marks m JOIN subjects sub ON sub.id = m.subject_id
         WHERE m.student_id = $1 AND m.published = TRUE`,
        [student.id]
      ),
      pool.query(
        `SELECT sub.name AS subject,
                COUNT(*) FILTER (WHERE a.status='present') AS present, COUNT(*) AS total
         FROM attendance a JOIN subjects sub ON sub.id = a.subject_id
         WHERE a.student_id = $1 GROUP BY sub.name`,
        [student.id]
      ),
    ]);

    return { role: 'student', studentId: student.id, marks: marks.rows, attendance: attendance.rows };
  }

  // Faculty / admin context could be added here (class-level aggregates only, never raw student PII beyond role).
  return { role: user.role };
}

// POST /api/ai/chat  body: { message: string }
async function chat(req, res, next) {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'message is required' });

    const context = await buildAuthorizedContext(req.user);

    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
    const response = await fetch(`${aiServiceUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
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
