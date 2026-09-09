// Generic controller for materials, assignments, and question banks —
// these three share the same "faculty uploads, student reads" shape.
const pool = require('../config/db');
const { getFacultyByUserId, assertAssignedToSubject } = require('./facultyController');

function makeResourceController(table, uploadFields) {
  return {
    // GET /api/<resource>?subjectId=
    async list(req, res, next) {
      try {
        const { subjectId } = req.query;
        const result = await pool.query(
          `SELECT r.*, sub.name AS subject_name, sub.code AS subject_code
           FROM ${table} r
           JOIN subjects sub ON sub.id = r.subject_id
           WHERE ($1::int IS NULL OR r.subject_id = $1)
           ORDER BY r.id DESC`,
          [subjectId || null]
        );
        res.json(result.rows);
      } catch (err) {
        next(err);
      }
    },

    // POST /api/<resource>  (faculty only, must be assigned to the subject)
    async create(req, res, next) {
      try {
        const faculty = await getFacultyByUserId(req.user.id);
        if (!faculty) return res.status(404).json({ error: 'Faculty profile not found' });

        const { subjectId } = req.body;
        const allowed = await assertAssignedToSubject(faculty.id, subjectId);
        if (!allowed) return res.status(403).json({ error: 'You are not assigned to this subject' });

        const columns = ['subject_id', ...uploadFields, 'uploaded_by'];
        const values = [subjectId, ...uploadFields.map((f) => req.body[toCamel(f)]), faculty.id];
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

        const result = await pool.query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        res.status(201).json(result.rows[0]);
      } catch (err) {
        next(err);
      }
    },
  };
}

function toCamel(snake) {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

module.exports = makeResourceController;
