const pool = require('../config/db');

async function getFacultyByUserId(userId) {
  const result = await pool.query(
    'SELECT id, department_id FROM faculty WHERE user_id = $1',
    [userId]
  );
  return result.rows[0] || null;
}

// GET /api/faculty/student-details/search?search=
async function searchStudents(req, res, next) {
  try {
    const faculty = await getFacultyByUserId(req.user.id);
    if (!faculty) return res.status(404).json({ error: 'Faculty profile not found' });

    const search = String(req.query.search || '').trim();
    if (!search) return res.json([]);

    const values = [`%${search}%`];
    let departmentFilter = '';

    if (faculty.department_id) {
      values.push(faculty.department_id);
      departmentFilter = 'AND s.department_id = $2';
    }

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS student_name,
        u.email,
        d.name AS department,
        div.name AS division,
        sem.number AS semester_number
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN departments d ON d.id = s.department_id
      LEFT JOIN divisions div ON div.id = s.division_id
      LEFT JOIN semesters sem ON sem.id = s.current_semester_id
      WHERE (
        u.full_name ILIKE $1
        OR s.student_code ILIKE $1
        OR u.email ILIKE $1
      )
      ${departmentFilter}
      ORDER BY u.full_name ASC
      LIMIT 20
      `,
      values
    );

    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

// GET /api/faculty/student-details/:studentId
async function getStudentDetails(req, res, next) {
  try {
    const faculty = await getFacultyByUserId(req.user.id);
    if (!faculty) return res.status(404).json({ error: 'Faculty profile not found' });

    const studentId = Number(req.params.studentId);
    if (!Number.isInteger(studentId) || studentId <= 0) {
      return res.status(400).json({ error: 'Invalid student id' });
    }

    const studentResult = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS student_name,
        u.email,
        d.name AS department,
        d.code AS department_code,
        div.name AS division,
        sem.number AS semester_number,
        ay.label AS academic_year
      FROM students s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN departments d ON d.id = s.department_id
      LEFT JOIN divisions div ON div.id = s.division_id
      LEFT JOIN semesters sem ON sem.id = s.current_semester_id
      LEFT JOIN academic_years ay ON ay.id = s.academic_year_id
      WHERE s.id = $1
        AND ($2::int IS NULL OR s.department_id = $2)
      `,
      [studentId, faculty.department_id || null]
    );

    if (!studentResult.rows.length) {
      return res.status(404).json({ error: 'Student not found or not in your department' });
    }

    const [attendanceResult, marksResult, assignmentsResult, achievementsResult] = await Promise.all([
      pool.query(
        `
        SELECT
          sub.id AS subject_id,
          sub.code,
          sub.name AS subject,
          COUNT(a.id)::int AS total_classes,
          COUNT(a.id) FILTER (WHERE a.status = 'present')::int AS present_classes,
          COUNT(a.id) FILTER (WHERE a.status = 'absent')::int AS absent_classes,
          CASE
            WHEN COUNT(a.id) = 0 THEN 0
            ELSE ROUND((COUNT(a.id) FILTER (WHERE a.status = 'present') * 100.0) / COUNT(a.id), 2)
          END AS percentage
        FROM student_subjects ss
        JOIN subjects sub ON sub.id = ss.subject_id
        LEFT JOIN attendance a
          ON a.student_id = ss.student_id
          AND a.subject_id = ss.subject_id
        WHERE ss.student_id = $1
          AND ss.status = 'approved'
        GROUP BY sub.id, sub.code, sub.name
        ORDER BY sub.name
        `,
        [studentId]
      ),
      pool.query(
        `
        SELECT
          m.id,
          sub.code,
          sub.name AS subject,
          m.exam_type,
          m.max_marks,
          m.obtained_marks,
          m.grade,
          m.published,
          m.created_at
        FROM marks m
        JOIN subjects sub ON sub.id = m.subject_id
        WHERE m.student_id = $1
        ORDER BY sub.name, CASE m.exam_type
          WHEN 'CT1' THEN 1
          WHEN 'CT2' THEN 2
          WHEN 'INTERNAL' THEN 3
          WHEN 'EXTERNAL' THEN 4
          WHEN 'END SEMESTER' THEN 5
          ELSE 6
        END
        `,
        [studentId]
      ),
      pool.query(
        `
        SELECT
          COUNT(*)::int AS submitted_count,
          COUNT(*) FILTER (WHERE sub.status = 'submitted')::int AS approved_count,
          COUNT(*) FILTER (WHERE sub.status = 'pending')::int AS pending_count,
          COUNT(*) FILTER (WHERE sub.status = 'rejected')::int AS rejected_count
        FROM assignment_submissions sub
        WHERE sub.student_id = $1
        `,
        [studentId]
      ),
      pool.query(
        `
        SELECT
          id,
          title,
          description,
          organization,
          achieved_on,
          certificate_path,
          skills,
          created_at
        FROM achievements
        WHERE student_id = $1
        ORDER BY achieved_on DESC NULLS LAST, created_at DESC
        `,
        [studentId]
      ),
    ]);

    const attendance = attendanceResult.rows.map((row) => ({
      ...row,
      total_classes: Number(row.total_classes),
      present_classes: Number(row.present_classes),
      absent_classes: Number(row.absent_classes),
      percentage: Number(row.percentage),
    }));

    const totalClasses = attendance.reduce((sum, row) => sum + row.total_classes, 0);
    const totalPresent = attendance.reduce((sum, row) => sum + row.present_classes, 0);
    const overallAttendance = totalClasses
      ? Number(((totalPresent / totalClasses) * 100).toFixed(2))
      : 0;

    res.json({
      student: studentResult.rows[0],
      attendance: {
        overallPercentage: overallAttendance,
        bySubject: attendance,
      },
      marks: marksResult.rows,
      assignments: assignmentsResult.rows[0] || {
        submitted_count: 0,
        approved_count: 0,
        pending_count: 0,
        rejected_count: 0,
      },
      achievements: achievementsResult.rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { searchStudents, getStudentDetails };
