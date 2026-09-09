const pool = require('../config/db');
const { getStudentByUserId } = require('./studentController');

// GET /api/students/achievements
async function listAchievements(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const result = await pool.query(
      'SELECT * FROM achievements WHERE student_id = $1 ORDER BY achieved_on DESC',
      [student.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// POST /api/students/achievements
async function addAchievement(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const { title, description, organization, achievedOn, certificatePath, skills } = req.body;
    if (!title) return res.status(400).json({ error: 'title is required' });

    const result = await pool.query(
      `INSERT INTO achievements (student_id, title, description, organization, achieved_on, certificate_path, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [student.id, title, description || null, organization || null, achievedOn || null, certificatePath || null, skills || []]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAchievements, addAchievement };
