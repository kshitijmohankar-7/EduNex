const pool = require('../config/db');
const { getStudentByUserId } = require('./studentController');

// GET /api/students/achievements
async function listAchievements(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const result = await pool.query(
      `SELECT id, title, description, organization, achieved_on,
              certificate_path, skills, created_at
       FROM achievements
       WHERE student_id = $1
       ORDER BY achieved_on DESC NULLS LAST, created_at DESC`,
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

    const { title, description, organization, achievedOn, skills } = req.body;
    if (!title || !String(title).trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!organization || !String(organization).trim()) {
      return res.status(400).json({ error: 'Organization is required' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Certificate file is required' });
    }

    const certificatePath = `/uploads/achievements/${req.file.filename}`;
    const parsedSkills = Array.isArray(skills)
      ? skills
      : String(skills || '').split(',').map((item) => item.trim()).filter(Boolean);

    const result = await pool.query(
      `INSERT INTO achievements
        (student_id, title, description, organization, achieved_on, certificate_path, skills)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, title, description, organization, achieved_on,
                 certificate_path, skills, created_at`,
      [
        student.id,
        String(title).trim(),
        description ? String(description).trim() : null,
        String(organization).trim(),
        achievedOn || null,
        certificatePath,
        parsedSkills,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listAchievements, addAchievement };
