const pool = require('../config/db');

async function getUserContext(userId) {
  const result = await pool.query(
    `SELECT u.id, u.role, u.full_name,
            s.department_id AS student_department_id,
            f.department_id AS faculty_department_id
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN faculty f ON f.user_id = u.id
      WHERE u.id = $1`,
    [userId]
  );
  return result.rows[0];
}

async function listAnnouncements(req, res, next) {
  try {
    const user = await getUserContext(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let query;
    let params = [];

    if (user.role === 'student') {
      query = `
        SELECT a.id, a.title, a.body, a.department_id, a.created_at,
               u.full_name AS posted_by_name, u.role AS posted_by_role
          FROM announcements a
          JOIN users u ON u.id = a.posted_by
         WHERE a.department_id IS NULL
            OR a.department_id = $1
         ORDER BY a.created_at DESC, a.id DESC`;
      params = [user.student_department_id];
    } else if (user.role === 'faculty') {
      query = `
        SELECT a.id, a.title, a.body, a.department_id, a.created_at,
               u.full_name AS posted_by_name, u.role AS posted_by_role
          FROM announcements a
          JOIN users u ON u.id = a.posted_by
         WHERE u.role = 'admin'
            OR a.posted_by = $1
         ORDER BY a.created_at DESC, a.id DESC`;
      params = [req.user.id];
    } else {
      query = `
        SELECT a.id, a.title, a.body, a.department_id, a.created_at,
               u.full_name AS posted_by_name, u.role AS posted_by_role,
               d.name AS department_name, d.code AS department_code
          FROM announcements a
          JOIN users u ON u.id = a.posted_by
          LEFT JOIN departments d ON d.id = a.department_id
         ORDER BY a.created_at DESC, a.id DESC`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const { title, body, departmentId } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Announcement title is required' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ error: 'Announcement message is required' });
    }

    const user = await getUserContext(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let targetDepartment = null;

    if (user.role === 'faculty') {
      if (!user.faculty_department_id) {
        return res.status(400).json({ error: 'Faculty department is not configured' });
      }
      targetDepartment = user.faculty_department_id;
    } else if (user.role === 'admin' && departmentId) {
      const department = await pool.query(
        'SELECT id FROM departments WHERE id = $1',
        [departmentId]
      );
      if (department.rowCount === 0) {
        return res.status(400).json({ error: 'Invalid department' });
      }
      targetDepartment = departmentId;
    }

    const result = await pool.query(
      `INSERT INTO announcements (title, body, department_id, posted_by)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, body, department_id, posted_by, created_at`,
      [title.trim(), body.trim(), targetDepartment, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
};
