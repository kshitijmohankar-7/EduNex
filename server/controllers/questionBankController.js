const fs = require('fs');
const path = require('path');
const pool = require('../config/db');

async function getFaculty(req) {
  const r = await pool.query('SELECT id, department_id FROM faculty WHERE user_id = $1', [req.user.id]);
  return r.rows[0] || null;
}

async function listQuestionBanks(req, res, next) {
  try {
    if (req.user.role === 'faculty') {
      const faculty = await getFaculty(req);
      if (!faculty) return res.status(404).json({ error: 'Faculty profile not found.' });
      const r = await pool.query(`
        SELECT qb.id, qb.subject_id, qb.unit, qb.title, qb.file_path, qb.uploaded_at,
               s.name AS subject, s.code
        FROM question_banks qb
        JOIN subjects s ON s.id = qb.subject_id
        WHERE EXISTS (
          SELECT 1 FROM faculty_subject_assignments fsa
          WHERE fsa.faculty_id = $1 AND fsa.subject_id = qb.subject_id
        )
        ORDER BY s.name, qb.unit, qb.title`, [faculty.id]);
      return res.json(r.rows);
    }

    if (req.user.role === 'student') {
      const r = await pool.query(`
        SELECT qb.id, qb.subject_id, qb.unit, qb.title, qb.file_path, qb.uploaded_at,
               s.name AS subject, s.code
        FROM question_banks qb
        JOIN subjects s ON s.id = qb.subject_id
        JOIN students st ON st.user_id = $1
        WHERE s.semester_id = st.current_semester_id
        ORDER BY s.name, qb.unit, qb.title`, [req.user.id]);
      return res.json(r.rows);
    }

    return res.status(403).json({ error: 'Question banks are available to students and faculty.' });
  } catch (err) { next(err); }
}

async function createQuestionBank(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Question bank file is required.' });
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ error: 'Faculty profile not found.' });

    const subjectId = Number(req.body.subjectId);
    const title = String(req.body.title || '').trim();
    const unit = String(req.body.unit || '').trim();
    if (!Number.isInteger(subjectId) || subjectId <= 0 || !title) {
      return res.status(400).json({ error: 'Subject and title are required.' });
    }

    const assigned = await pool.query(`
      SELECT 1 FROM faculty_subject_assignments
      WHERE faculty_id = $1 AND subject_id = $2 LIMIT 1`, [faculty.id, subjectId]);
    if (!assigned.rows.length) {
      return res.status(403).json({ error: 'You can only upload question banks for your assigned subjects.' });
    }

    const relativePath = `/uploads/question-banks/${req.file.filename}`;
    const r = await pool.query(`
      INSERT INTO question_banks (subject_id, unit, title, file_path, uploaded_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *`, [subjectId, unit || null, title, relativePath, faculty.id]);

    res.status(201).json({ message: 'Question bank uploaded successfully.', questionBank: r.rows[0] });
  } catch (err) {
    if (req.file?.path) { try { fs.unlinkSync(req.file.path); } catch (_) {} }
    next(err);
  }
}

async function deleteQuestionBank(req, res, next) {
  try {
    const faculty = await getFaculty(req);
    if (!faculty) return res.status(404).json({ error: 'Faculty profile not found.' });
    const id = Number(req.params.id);
    const r = await pool.query(`
      DELETE FROM question_banks qb
      WHERE qb.id = $1 AND qb.uploaded_by = $2
      RETURNING qb.id, qb.file_path`, [id, faculty.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Question bank not found or not owned by you.' });
    const filePath = r.rows[0].file_path;
    if (filePath) {
      const absolute = path.join(__dirname, '..', '..', filePath.replace(/^\//, ''));
      try { if (fs.existsSync(absolute)) fs.unlinkSync(absolute); } catch (_) {}
    }
    res.json({ message: 'Question bank deleted.' });
  } catch (err) { next(err); }
}

module.exports = { listQuestionBanks, createQuestionBank, deleteQuestionBank };
