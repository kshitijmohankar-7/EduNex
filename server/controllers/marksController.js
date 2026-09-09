const pool = require('../config/db');

const EXAM_TYPES = ['CT1', 'CT2', 'INTERNAL', 'EXTERNAL', 'END SEMESTER'];

async function getFacultyByUserId(userId) {
  const result = await pool.query(`SELECT id FROM faculty WHERE user_id = $1`, [userId]);
  return result.rows[0] || null;
}

function calculateGrade(obtained, max) {
  if (max <= 0) return 'F';
  const percentage = (obtained / max) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

function isExternalOnly(subject) {
  const name = String(subject.name || '').toLowerCase();
  const code = String(subject.code || '').toLowerCase();
  const category = String(subject.subject_category || '').toLowerCase();

  return (
    category === 'liberal_learning' ||
    code.startsWith('llm-') ||
    code.startsWith('llm') ||
    name.includes('micro project') ||
    code.includes('micro') ||
    name.includes('lab') ||
    code.includes('-lab') ||
    code.endsWith('lab')
  );
}

async function searchStudents(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    if (!search) return res.json([]);

    const result = await pool.query(
      `
      SELECT s.id, s.student_code, u.full_name AS student_name, u.email
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE u.full_name ILIKE $1 OR s.student_code ILIKE $1
      ORDER BY u.full_name ASC
      LIMIT 20
      `,
      [`%${search}%`]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getStudentForMarks(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT s.id, s.student_code, u.full_name AS student_name, u.email
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      `,
      [req.params.studentId]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Student not found' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

const ENROLLED_SUBJECTS_SQL = `
  SELECT DISTINCT id, name, code, credits, subject_category
  FROM (
    SELECT sub.id, sub.name, sub.code, sub.credits, sub.subject_category
    FROM student_subjects ss
    JOIN subjects sub ON sub.id = ss.subject_id
    WHERE ss.student_id = $1
      AND (ss.status IS NULL OR LOWER(ss.status) = 'approved')

    UNION

    SELECT sub.id, sub.name, sub.code, sub.credits, sub.subject_category
    FROM subject_choices sc
    JOIN subjects sub ON sub.id = sc.open_elective_subject_id
    WHERE sc.student_id = $1
      AND LOWER(sc.status) = 'approved'

    UNION

    SELECT sub.id, sub.name, sub.code, sub.credits, sub.subject_category
    FROM subject_choices sc
    JOIN subjects sub ON sub.id = sc.lll_subject_id
    WHERE sc.student_id = $1
      AND LOWER(sc.status) = 'approved'
  ) enrolled
  ORDER BY code ASC
`;

async function getStudentSubjects(req, res, next) {
  try {
    const { studentId } = req.params;

    const studentResult = await pool.query(
      `
      SELECT s.id, s.student_code, u.full_name AS student_name, u.email
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      `,
      [studentId]
    );

    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student not found' });

    const result = await pool.query(ENROLLED_SUBJECTS_SQL, [studentId]);

    const subjects = result.rows.map((subject) => {
      const externalOnly = isExternalOnly(subject);
      return {
        ...subject,
        externalOnly,
        allowedExamTypes: externalOnly ? ['EXTERNAL'] : EXAM_TYPES,
      };
    });

    res.json({ student: studentResult.rows[0], subjects });
  } catch (err) {
    next(err);
  }
}

async function getStudentMarksForExam(req, res, next) {
  try {
    const { studentId } = req.params;
    const examType = String(req.query.examType || '').trim().toUpperCase();

    if (!EXAM_TYPES.includes(examType)) {
      return res.status(400).json({
        error: 'Invalid exam type. Allowed: CT1, CT2, INTERNAL, EXTERNAL, END SEMESTER',
      });
    }

    const studentResult = await pool.query(
      `
      SELECT s.id, s.student_code, u.full_name AS student_name, u.email
      FROM students s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
      `,
      [studentId]
    );

    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student not found' });

    const subjectResult = await pool.query(ENROLLED_SUBJECTS_SQL, [studentId]);

    const marksResult = await pool.query(
      `
      SELECT id, student_id, subject_id, exam_type, max_marks,
             obtained_marks, grade, published, created_at
      FROM marks
      WHERE student_id = $1 AND exam_type = $2
      ORDER BY subject_id
      `,
      [studentId, examType]
    );

    const markMap = new Map(marksResult.rows.map((mark) => [Number(mark.subject_id), mark]));

    const subjects = subjectResult.rows.map((subject) => {
      const externalOnly = isExternalOnly(subject);
      const existingMark = markMap.get(Number(subject.id)) || null;

      return {
        ...subject,
        externalOnly,
        allowedExamTypes: externalOnly ? ['EXTERNAL'] : EXAM_TYPES,
        mark: existingMark
          ? {
              id: existingMark.id,
              maxMarks: existingMark.max_marks,
              obtainedMarks: existingMark.obtained_marks,
              grade: existingMark.grade,
              published: existingMark.published,
            }
          : null,
      };
    });

    const invalidSubjects = subjects
      .filter((subject) => subject.externalOnly && examType !== 'EXTERNAL')
      .map(({ id, name, code }) => ({ id, name, code }));

    res.json({
      student: studentResult.rows[0],
      examType,
      subjects,
      invalidSubjects,
    });
  } catch (err) {
    next(err);
  }
}

async function saveBulkMarks(req, res, next) {
  const client = await pool.connect();

  try {
    const { studentId, examType, marks } = req.body;

    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const normalizedExamType = String(examType || '').trim().toUpperCase();
    if (!EXAM_TYPES.includes(normalizedExamType)) {
      return res.status(400).json({ error: 'Invalid exam type' });
    }

    if (!Array.isArray(marks)) return res.status(400).json({ error: 'marks must be an array' });

    const faculty = await getFacultyByUserId(req.user.id);
    if (!faculty) return res.status(404).json({ error: 'Faculty profile not found' });

    const student = await pool.query(`SELECT id FROM students WHERE id = $1`, [studentId]);
    if (!student.rows.length) return res.status(404).json({ error: 'Student not found' });

    const enrolledResult = await pool.query(ENROLLED_SUBJECTS_SQL, [studentId]);
    const enrolledMap = new Map(enrolledResult.rows.map((subject) => [Number(subject.id), subject]));
    const preparedMarks = [];

    for (const item of marks) {
      if (!item || !item.subjectId) continue;

      const subjectId = Number(item.subjectId);
      const subject = enrolledMap.get(subjectId);

      if (!subject) {
        return res.status(400).json({ error: `Subject ${subjectId} is not enrolled by this student` });
      }

      if (isExternalOnly(subject) && normalizedExamType !== 'EXTERNAL') {
        return res.status(400).json({ error: `${subject.name} can only have EXTERNAL marks` });
      }

      if (item.obtainedMarks === undefined || item.obtainedMarks === null || item.obtainedMarks === '') continue;

      if (item.maxMarks === undefined || item.maxMarks === null || item.maxMarks === '') {
        return res.status(400).json({ error: `Maximum marks are required for ${subject.name}` });
      }

      const max = Number(item.maxMarks);
      const obtained = Number(item.obtainedMarks);

      if (!Number.isFinite(max) || max <= 0) {
        return res.status(400).json({ error: `Maximum marks for ${subject.name} must be greater than 0` });
      }

      if (!Number.isFinite(obtained) || obtained < 0 || obtained > max) {
        return res.status(400).json({ error: `Marks for ${subject.name} must be between 0 and ${max}` });
      }

      preparedMarks.push({
        subjectId,
        max,
        obtained,
        grade: calculateGrade(obtained, max),
      });
    }

    if (!preparedMarks.length) {
      return res.status(400).json({ error: 'Enter at least one mark before saving' });
    }

    await client.query('BEGIN');
    const savedMarks = [];

    for (const item of preparedMarks) {
      const existing = await client.query(
        `SELECT id FROM marks WHERE student_id = $1 AND subject_id = $2 AND exam_type = $3`,
        [studentId, item.subjectId, normalizedExamType]
      );

      if (existing.rows.length) {
        const updated = await client.query(
          `
          UPDATE marks
          SET max_marks = $1,
              obtained_marks = $2,
              grade = $3,
              entered_by = $4,
              published = true
          WHERE id = $5
          RETURNING id, student_id, subject_id, exam_type, max_marks,
                    obtained_marks, grade, entered_by, published, created_at
          `,
          [item.max, item.obtained, item.grade, faculty.id, existing.rows[0].id]
        );
        savedMarks.push(updated.rows[0]);
      } else {
        const inserted = await client.query(
          `
          INSERT INTO marks
            (student_id, subject_id, exam_type, max_marks, obtained_marks,
             grade, entered_by, published)
          VALUES ($1, $2, $3, $4, $5, $6, $7, true)
          RETURNING id, student_id, subject_id, exam_type, max_marks,
                    obtained_marks, grade, entered_by, published, created_at
          `,
          [studentId, item.subjectId, normalizedExamType, item.max, item.obtained, item.grade, faculty.id]
        );
        savedMarks.push(inserted.rows[0]);
      }
    }

    await client.query('COMMIT');

    res.json({
      message: 'Marks saved and published successfully',
      studentId,
      examType: normalizedExamType,
      savedCount: savedMarks.length,
      marks: savedMarks,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function publishMarks(req, res, next) {
  try {
    const faculty = await getFacultyByUserId(req.user.id);
    if (!faculty) return res.status(404).json({ error: 'Faculty profile not found' });

    const result = await pool.query(
      `
      UPDATE marks
      SET published = true
      WHERE id = $1 AND entered_by = $2
      RETURNING *
      `,
      [req.params.markId, faculty.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Mark not found or you are not authorized to publish it' });
    }

    res.json({ message: 'Mark published successfully', mark: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getStudentMarks(req, res, next) {
  try {
    const studentResult = await pool.query(`SELECT id FROM students WHERE user_id = $1`, [req.user.id]);
    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student profile not found' });

    const result = await pool.query(
      `
      SELECT m.id, m.student_id, m.subject_id, m.exam_type, m.max_marks,
             m.obtained_marks, m.grade, m.published, m.created_at,
             s.name AS subject, s.code, s.credits
      FROM marks m
      JOIN subjects s ON s.id = m.subject_id
      WHERE m.student_id = $1 AND m.published = true
      ORDER BY s.code ASC, m.exam_type ASC
      `,
      [studentResult.rows[0].id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchStudents,
  getStudentForMarks,
  getStudentSubjects,
  getStudentMarksForExam,
  saveBulkMarks,
  publishMarks,
  getStudentMarks,
};