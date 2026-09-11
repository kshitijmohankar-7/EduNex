// Bridges chat requests from the frontend to the Python AI microservice.
// The Node layer is responsible for attaching ONLY data the current user is authorized to see.
const pool = require('../config/db');
const { getStudentByUserId } = require('./studentController');

function detectRequestedData(message, history = []) {
  const text = [message, ...history.map((item) => item?.content || '')]
    .join(' ')
    .toLowerCase();

  const allDashboard = /\b(my dashboard|student dashboard|everything about me|all my details|overall progress|academic progress|my complete data)\b/.test(text);
  const planning = /\b(study plan|study schedule|how am i doing|where should i focus|which subjects should i focus|what should i improve|what should i study)\b/.test(text);

  return {
    allDashboard,
    profile: allDashboard || /\b(profile|student id|student code|department|course|semester|division|academic year|email|my details)\b/.test(text),
    attendance: allDashboard || planning || /\b(attendance|present|absent|classes|75%|shortage)\b/.test(text),
    marks: allDashboard || planning || /\b(mark|marks|score|scores|grade|grades|ct1|ct-1|ct2|ct-2|internal|external|end sem|end-sem|performance|result)\b/.test(text),
    assignments: allDashboard || planning || /\b(assignment|assignments|deadline|submission|submitted|pending)\b/.test(text),
    announcements: allDashboard || /\b(announcement|announcements|notice|notices|circular|circulars)\b/.test(text),
    materials: allDashboard || /\b(study material|study materials|material|materials|notes|pdf|document|documents|unit|chapter|lecture notes|class notes)\b/.test(text),
    achievements: allDashboard || /\b(achievement|achievements|certificate|certificates|award|awards|skills)\b/.test(text),
    electives: allDashboard || /\b(elective|electives|liberal learning|lll|subject choice|subject selection)\b/.test(text),
    marksheets: allDashboard || /\b(marksheet|marksheets|sgpa|cgpa|semester result)\b/.test(text),
  };
}

async function buildAuthorizedContext(user, message, history = []) {
  if (user.role !== 'student') return { role: user.role };

  const student = await getStudentByUserId(user.id);
  if (!student) return { role: 'student' };

  const requested = detectRequestedData(message, history);
  const context = {
    role: 'student',
    studentId: student.id,
    availableDashboardData: [
      'profile',
      'attendance',
      'marks',
      'assignments',
      'announcements',
      'study materials',
      'achievements',
      'elective choice',
      'marksheets',
    ],
  };

  const jobs = [];

  if (requested.profile) {
    jobs.push(
      pool.query(
        `SELECT s.id, s.student_code, u.full_name, u.email,
                d.name AS department, c.name AS course,
                sem.number AS semester, div.name AS division,
                ay.label AS academic_year
         FROM students s
         JOIN users u ON u.id = s.user_id
         LEFT JOIN departments d ON d.id = s.department_id
         LEFT JOIN courses c ON c.id = s.course_id
         LEFT JOIN semesters sem ON sem.id = s.current_semester_id
         LEFT JOIN divisions div ON div.id = s.division_id
         LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
         WHERE s.id = $1`,
        [student.id]
      ).then((result) => { context.profile = result.rows[0] || null; })
    );
  }

  if (requested.attendance) {
    jobs.push(
      pool.query(
        `SELECT sub.name AS subject, sub.code,
                COUNT(*) FILTER (WHERE a.status = 'present') AS present,
                COUNT(*) AS total
         FROM attendance a
         JOIN subjects sub ON sub.id = a.subject_id
         WHERE a.student_id = $1
         GROUP BY sub.id, sub.name, sub.code
         ORDER BY sub.name`,
        [student.id]
      ).then((result) => {
        const rows = result.rows.map((row) => {
          const present = Number(row.present || 0);
          const total = Number(row.total || 0);
          return {
            subject: row.subject,
            code: row.code,
            present,
            total,
            percentage: total > 0 ? Number(((present / total) * 100).toFixed(2)) : 0,
          };
        });
        const totalPresent = rows.reduce((sum, row) => sum + row.present, 0);
        const totalClasses = rows.reduce((sum, row) => sum + row.total, 0);
        context.attendance = {
          overallPercentage: totalClasses > 0
            ? Number(((totalPresent / totalClasses) * 100).toFixed(2))
            : 0,
          bySubject: rows,
        };
      })
    );
  }

  if (requested.marks) {
    jobs.push(
      pool.query(
        `SELECT sub.name AS subject, sub.code, m.exam_type,
                m.obtained_marks, m.max_marks, m.grade
         FROM marks m
         JOIN subjects sub ON sub.id = m.subject_id
         WHERE m.student_id = $1 AND m.published = TRUE
         ORDER BY sub.name, m.exam_type`,
        [student.id]
      ).then((result) => { context.marks = result.rows; })
    );
  }

  if (requested.assignments) {
    jobs.push(
      pool.query(
        `SELECT a.id, a.title, a.description, a.issue_date, a.deadline,
                sub.name AS subject, sub.code,
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
      ).then((result) => { context.assignments = result.rows; })
    );
  }

  if (requested.announcements) {
    jobs.push(
      pool.query(
        `SELECT a.id, a.title, a.body, a.created_at,
                u.full_name AS posted_by_name, u.role AS posted_by_role
         FROM announcements a
         JOIN users u ON u.id = a.posted_by
         JOIN students st ON st.id = $1
         WHERE a.department_id IS NULL
            OR a.department_id = st.department_id
         ORDER BY a.created_at DESC, a.id DESC`,
        [student.id]
      ).then((result) => { context.announcements = result.rows; })
    );
  }

  if (requested.materials) {
    jobs.push(
      pool.query(
        `SELECT sm.id, sm.subject_id, sm.title, sm.unit, sm.file_type, sm.uploaded_at,
                s.name AS subject, s.code
         FROM study_materials sm
         JOIN subjects s ON s.id = sm.subject_id
         ORDER BY s.name, sm.unit, sm.title`
      ).then((result) => { context.studyMaterials = result.rows; })
    );
  }

  if (requested.achievements) {
    jobs.push(
      pool.query(
        `SELECT id, title, description, organization, achieved_on, skills, created_at
         FROM achievements
         WHERE student_id = $1
         ORDER BY achieved_on DESC NULLS LAST, created_at DESC`,
        [student.id]
      ).then((result) => { context.achievements = result.rows; })
    );
  }

  if (requested.electives) {
    jobs.push(
      pool.query(
        `SELECT sc.id, sc.status,
                oe.name AS open_elective, oe.code AS open_elective_code,
                ll.name AS liberal_learning, ll.code AS liberal_learning_code,
                sc.created_at, sc.updated_at
         FROM subject_choices sc
         LEFT JOIN subjects oe ON oe.id = sc.open_elective_subject_id
         LEFT JOIN subjects ll ON ll.id = sc.lll_subject_id
         WHERE sc.student_id = $1
         ORDER BY sc.created_at DESC
         LIMIT 1`,
        [student.id]
      ).then((result) => { context.electiveChoice = result.rows[0] || null; })
    );
  }

  if (requested.marksheets) {
    jobs.push(
      pool.query(
        `SELECT ms.id, ms.sgpa, ms.cgpa, ms.result_status,
                ms.published_at, sem.number AS semester_number
         FROM marksheets ms
         JOIN semesters sem ON sem.id = ms.semester_id
         WHERE ms.student_id = $1
           AND ms.published_at IS NOT NULL
           AND ms.file_path IS NOT NULL
         ORDER BY sem.number DESC, ms.published_at DESC`,
        [student.id]
      ).then((result) => { context.marksheets = result.rows; })
    );
  }

  await Promise.all(jobs);
  return context;
}

// POST /api/ai/chat body: { message: string, history?: [{role, content}] }
async function chat(req, res, next) {
  try {
    const { message, history = [] } = req.body;
    const trimmed = String(message || '').trim();

    if (!trimmed) {
      return res.status(400).json({ error: 'message is required' });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
          .slice(-8)
          .map((item) => ({ role: item.role, content: String(item.content || '').slice(0, 2000) }))
      : [];

    const context = await buildAuthorizedContext(req.user, trimmed, safeHistory);
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    const response = await fetch(`${aiServiceUrl}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: trimmed, history: safeHistory, context }),
    });

    if (!response.ok) {
      let detail = '';
      try {
        const body = await response.json();
        detail = body?.error ? `: ${body.error}` : '';
      } catch (_) {}
      return res.status(502).json({ error: `AI service is currently unavailable${detail}` });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('AI chat error:', err);
    next(err);
  }
}

module.exports = { chat };
