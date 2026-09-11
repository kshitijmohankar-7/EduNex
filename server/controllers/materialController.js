const pool = require('../config/db');

async function indexMaterialWithAI({ subjectId, title, filePath }) {
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await fetch(`${aiServiceUrl}/index-file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subject_id: Number(subjectId),
        title,
        file_path: filePath,
      }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.error) {
      return {
        success: false,
        chunksIndexed: Number(data.chunks_indexed || 0),
        error: data.error || `AI service returned ${response.status}`,
      };
    }

    return {
      success: true,
      chunksIndexed: Number(data.chunks_indexed || 0),
      ragAvailable: Boolean(data.rag_available),
    };
  } catch (err) {
    return {
      success: false,
      chunksIndexed: 0,
      error: err.name === 'AbortError' ? 'AI indexing timed out' : err.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

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
        s.id AS subject_id,
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
// Faculty uploads study material and automatically indexes it for EduNex RAG.
async function createMaterial(req, res, next) {
  try {
    const {
      subjectId,
      title,
      unit,
    } = req.body;

    if (!subjectId || !title) {
      return res.status(400).json({
        error: 'subjectId and title are required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: 'Study material file is required',
      });
    }

    const subject = await pool.query(
      'SELECT id FROM subjects WHERE id = $1',
      [subjectId]
    );

    if (subject.rows.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
      });
    }

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

    // Indexing is intentionally performed after the DB insert. If the AI
    // service is temporarily unavailable, the faculty upload still succeeds
    // and the returned status makes the indexing problem visible.
    const rag = await indexMaterialWithAI({
      subjectId,
      title,
      filePath: req.file.path,
    });

    res.status(201).json({
      message: 'Study material uploaded successfully',
      material: result.rows[0],
      rag: {
        indexed: rag.success,
        chunksIndexed: rag.chunksIndexed,
        available: rag.ragAvailable !== false,
        error: rag.error || null,
      },
    });
  } catch (err) {
    next(err);
  }
}


module.exports = {
  getMaterials,
  createMaterial,
};
