const pool = require('../config/db');

// GET /api/materials
// Students can view study materials.
async function getMaterials(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        sm.id,
        sm.title,
        sm.unit,
        sm.file_path,
        sm.file_type,
        sm.uploaded_at,
        s.name AS subject,
        s.code
      FROM study_materials sm
      JOIN subjects s ON s.id = sm.subject_id
      ORDER BY s.name, sm.unit, sm.title
    `);

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}


// POST /api/materials
// Faculty uploads study material.
async function createMaterial(req, res, next) {
  try {
    const {
      subjectId,
      title,
      unit,
    } = req.body;

    // Validate required fields
    if (!subjectId || !title) {
      return res.status(400).json({
        error: 'subjectId and title are required',
      });
    }

    // Make sure a file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: 'Study material file is required',
      });
    }

    // Check that subject exists
    const subject = await pool.query(
      'SELECT id FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subject.rows.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
      });
    }

    // Find faculty record using logged-in user's ID
    const faculty = await pool.query(
      'SELECT id FROM faculty WHERE user_id = $1',
      [req.user.id]
    );

    if (faculty.rows.length === 0) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const facultyId = faculty.rows[0].id;

    // Insert study material
    const result = await pool.query(
      `INSERT INTO study_materials
       (
         subject_id,
         title,
         unit,
         file_path,
         file_type,
         uploaded_by
       )
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING
         id,
         subject_id,
         title,
         unit,
         file_path,
         file_type,
         uploaded_by,
         uploaded_at`,
      [
        subjectId,
        title,
        unit || null,
        req.file.path,
        req.file.mimetype,
        facultyId,
      ]
    );

    res.status(201).json({
      message: 'Study material uploaded successfully',
      material: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}


module.exports = {
  getMaterials,
  createMaterial,
};