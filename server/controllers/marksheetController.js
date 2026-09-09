const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function getFacultyByUserId(userId) {
  const result = await pool.query(
    'SELECT id FROM faculty WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

async function searchStudentsForMarksheet(req, res, next) {
  try {
    const search = String(req.query.search || '').trim();
    if (!search) return res.json([]);

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS student_name,
        u.email,
        s.current_semester_id,
        sem.number AS semester_number
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN semesters sem ON sem.id = s.current_semester_id
      WHERE u.full_name ILIKE $1
         OR s.student_code ILIKE $1
         OR u.email ILIKE $1
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

async function uploadMarksheet(req, res, next) {
  try {
    const faculty = await getFacultyByUserId(req.user.id);
    if (!faculty) return res.status(404).json({ error: 'Faculty profile not found' });

    if (!req.file) {
      return res.status(400).json({ error: 'Please select a marksheet PDF' });
    }

    const studentId = Number(req.body.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ error: 'A valid student is required' });
    }

    const studentResult = await pool.query(
      `
      SELECT id, current_semester_id
      FROM students
      WHERE id = $1
      `,
      [studentId]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const semesterId = Number(req.body.semesterId || studentResult.rows[0].current_semester_id);
    if (!Number.isInteger(semesterId) || semesterId <= 0) {
      return res.status(400).json({ error: 'A valid semester is required' });
    }

    const semesterResult = await pool.query(
      'SELECT id, number FROM semesters WHERE id = $1',
      [semesterId]
    );

    if (!semesterResult.rows.length) {
      return res.status(400).json({ error: 'Semester not found' });
    }

    const sgpa = req.body.sgpa === '' || req.body.sgpa === undefined ? null : Number(req.body.sgpa);
    const cgpa = req.body.cgpa === '' || req.body.cgpa === undefined ? null : Number(req.body.cgpa);
    const resultStatus = String(req.body.resultStatus || '').trim() || null;

    if (sgpa !== null && (!Number.isFinite(sgpa) || sgpa < 0 || sgpa > 10)) {
      return res.status(400).json({ error: 'SGPA must be between 0 and 10' });
    }

    if (cgpa !== null && (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10)) {
      return res.status(400).json({ error: 'CGPA must be between 0 and 10' });
    }

    const relativePath = `/uploads/marksheets/${req.file.filename}`;

    const result = await pool.query(
      `
      INSERT INTO marksheets
        (student_id, semester_id, sgpa, cgpa, result_status,
         file_path, file_name, file_type, uploaded_by, published_at, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (student_id, semester_id)
      DO UPDATE SET
        sgpa = EXCLUDED.sgpa,
        cgpa = EXCLUDED.cgpa,
        result_status = EXCLUDED.result_status,
        file_path = EXCLUDED.file_path,
        file_name = EXCLUDED.file_name,
        file_type = EXCLUDED.file_type,
        uploaded_by = EXCLUDED.uploaded_by,
        published_at = NOW()
      RETURNING *
      `,
      [
        studentId,
        semesterId,
        sgpa,
        cgpa,
        resultStatus,
        relativePath,
        req.file.originalname,
        req.file.mimetype,
        faculty.id,
      ]
    );

    res.status(201).json({
      message: 'Marksheet uploaded and published successfully',
      marksheet: result.rows[0],
    });
  } catch (err) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (_) {
        // Ignore cleanup failures and return the original error.
      }
    }
    next(err);
  }
}

async function getStudentMarksheets(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT
        ms.id,
        ms.student_id,
        ms.semester_id,
        ms.sgpa,
        ms.cgpa,
        ms.result_status,
        ms.file_path,
        ms.file_name,
        ms.file_type,
        ms.published_at,
        sem.number AS semester_number
      FROM marksheets ms
      JOIN students st ON st.id = ms.student_id
      JOIN semesters sem ON sem.id = ms.semester_id
      WHERE st.user_id = $1
        AND ms.published_at IS NOT NULL
        AND ms.file_path IS NOT NULL
      ORDER BY sem.number DESC, ms.published_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  searchStudentsForMarksheet,
  uploadMarksheet,
  getStudentMarksheets,
};
