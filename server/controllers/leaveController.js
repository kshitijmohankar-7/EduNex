const pool = require('../config/db');

async function getStudentId(userId) {
  const result = await pool.query('SELECT id FROM students WHERE user_id = $1', [userId]);
  return result.rows[0]?.id || null;
}

async function getFacultyId(userId) {
  const result = await pool.query('SELECT id FROM faculty WHERE user_id = $1', [userId]);
  return result.rows[0]?.id || null;
}

async function getFacultyOptions(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT f.id, u.full_name AS name
      FROM faculty f
      JOIN users u ON u.id = f.user_id
      WHERE u.is_active = TRUE
      ORDER BY u.full_name
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function createLeaveRequest(req, res, next) {
  try {
    const studentId = await getStudentId(req.user.id);
    if (!studentId) return res.status(404).json({ error: 'Student profile not found' });

    const { facultyId, startDate, endDate, reason } = req.body;
    if (!facultyId || !startDate || !endDate || !reason?.trim()) {
      return res.status(400).json({ error: 'facultyId, startDate, endDate and reason are required' });
    }
    if (endDate < startDate) return res.status(400).json({ error: 'End date cannot be before start date' });
    if (reason.trim().length < 5) return res.status(400).json({ error: 'Please provide a meaningful reason' });

    const faculty = await pool.query(`
      SELECT f.id
      FROM faculty f JOIN users u ON u.id = f.user_id
      WHERE f.id = $1 AND u.is_active = TRUE
    `, [facultyId]);
    if (!faculty.rows.length) return res.status(404).json({ error: 'Faculty member not found' });

    const duplicate = await pool.query(`
      SELECT id FROM leave_requests
      WHERE student_id = $1 AND start_date = $2 AND end_date = $3 AND status = 'pending'
      LIMIT 1
    `, [studentId, startDate, endDate]);
    if (duplicate.rows.length) return res.status(409).json({ error: 'A pending leave request already exists for this duration' });

    const result = await pool.query(`
      INSERT INTO leave_requests (student_id, faculty_id, start_date, end_date, reason)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, start_date, end_date, reason, status, created_at
    `, [studentId, facultyId, startDate, endDate, reason.trim()]);

    res.status(201).json({ message: 'Leave request sent to faculty', request: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

async function getStudentLeaveRequests(req, res, next) {
  try {
    const studentId = await getStudentId(req.user.id);
    if (!studentId) return res.status(404).json({ error: 'Student profile not found' });

    const result = await pool.query(`
      SELECT lr.id, lr.start_date, lr.end_date, lr.reason, lr.status, lr.faculty_note,
             lr.reviewed_at, lr.created_at, u.full_name AS faculty_name
      FROM leave_requests lr
      JOIN faculty f ON f.id = lr.faculty_id
      JOIN users u ON u.id = f.user_id
      WHERE lr.student_id = $1
      ORDER BY lr.created_at DESC
    `, [studentId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function getFacultyLeaveRequests(req, res, next) {
  try {
    const facultyId = await getFacultyId(req.user.id);
    if (!facultyId) return res.status(404).json({ error: 'Faculty profile not found' });

    const result = await pool.query(`
      SELECT lr.id, lr.start_date, lr.end_date, lr.reason, lr.status, lr.faculty_note,
             lr.created_at, lr.reviewed_at, s.student_code, u.full_name AS student_name
      FROM leave_requests lr
      JOIN students s ON s.id = lr.student_id
      JOIN users u ON u.id = s.user_id
      WHERE lr.faculty_id = $1
      ORDER BY CASE WHEN lr.status = 'pending' THEN 0 ELSE 1 END, lr.created_at DESC
    `, [facultyId]);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

async function reviewLeaveRequest(req, res, next) {
  try {
    const facultyId = await getFacultyId(req.user.id);
    if (!facultyId) return res.status(404).json({ error: 'Faculty profile not found' });

    const { requestId } = req.params;
    const { status, facultyNote = '' } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be approved or rejected' });

    const result = await pool.query(`
      UPDATE leave_requests
      SET status = $1, faculty_note = $2, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $3 AND faculty_id = $4 AND status = 'pending'
      RETURNING id, status, faculty_note, reviewed_at
    `, [status, facultyNote.trim(), requestId, facultyId]);

    if (!result.rows.length) return res.status(404).json({ error: 'Pending leave request not found or already reviewed' });
    res.json({ message: `Leave request ${status}`, request: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { getFacultyOptions, createLeaveRequest, getStudentLeaveRequests, getFacultyLeaveRequests, reviewLeaveRequest };
