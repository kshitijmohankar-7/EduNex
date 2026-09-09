const pool = require('../config/db');

// ======================================================
// GET STUDENTS FOR ATTENDANCE
// ======================================================

async function getStudentsForAttendance(req, res, next) {
  try {
    const { subjectId } = req.query;

    if (!subjectId) {
      return res.status(400).json({
        error: 'subjectId is required',
      });
    }

    const result = await pool.query(
      `
      SELECT
        st.id,
        st.student_code,
        u.full_name AS name
      FROM students st
      JOIN users u
        ON u.id = st.user_id
      WHERE st.current_semester_id = (
        SELECT semester_id
        FROM subjects
        WHERE id = $1
      )
      ORDER BY st.student_code
      `,
      [subjectId]
    );

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// MARK ATTENDANCE
// ======================================================

async function markAttendance(req, res, next) {
  try {
    const {
      subjectId,
      classDate,
      attendance,
    } = req.body;

    if (!subjectId || !classDate || !Array.isArray(attendance)) {
      return res.status(400).json({
        error: 'subjectId, classDate and attendance are required',
      });
    }


    // --------------------------------------------------
    // Find faculty
    // --------------------------------------------------

    const faculty = await pool.query(
      `
      SELECT id
      FROM faculty
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    if (faculty.rows.length === 0) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const facultyId = faculty.rows[0].id;


    // --------------------------------------------------
    // Check subject
    // --------------------------------------------------

    const subject = await pool.query(
      `
      SELECT id
      FROM subjects
      WHERE id = $1
      `,
      [subjectId]
    );

    if (subject.rows.length === 0) {
      return res.status(404).json({
        error: 'Subject not found',
      });
    }


    // --------------------------------------------------
    // Insert / update attendance
    // --------------------------------------------------

    for (const record of attendance) {

      if (!record.studentId || !record.status) {
        continue;
      }

      if (!['present', 'absent'].includes(record.status)) {
        continue;
      }


      // Check existing attendance
      const existing = await pool.query(
        `
        SELECT id
        FROM attendance
        WHERE student_id = $1
          AND subject_id = $2
          AND class_date = $3
        `,
        [
          record.studentId,
          subjectId,
          classDate,
        ]
      );


      // ------------------------------------------------
      // Update existing record
      // ------------------------------------------------

      if (existing.rows.length > 0) {

        await pool.query(
          `
          UPDATE attendance
          SET
            status = $1,
            marked_by = $2
          WHERE id = $3
          `,
          [
            record.status,
            facultyId,
            existing.rows[0].id,
          ]
        );

      }


      // ------------------------------------------------
      // Insert new record
      // ------------------------------------------------

      else {

        await pool.query(
          `
          INSERT INTO attendance
          (
            student_id,
            subject_id,
            class_date,
            status,
            marked_by
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          `,
          [
            record.studentId,
            subjectId,
            classDate,
            record.status,
            facultyId,
          ]
        );

      }
    }


    res.status(201).json({
      message: 'Attendance saved successfully',
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// GET STUDENT ATTENDANCE
// ======================================================

async function getStudentAttendance(req, res, next) {
  try {

    const student = await pool.query(
      `
      SELECT id
      FROM students
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({
        error: 'Student profile not found',
      });
    }

    const studentId = student.rows[0].id;


    const result = await pool.query(
      `
      SELECT
        a.id,
        a.class_date,
        a.status,
        s.id AS subject_id,
        s.name AS subject,
        s.code
      FROM attendance a
      JOIN subjects s
        ON s.id = a.subject_id
      WHERE a.student_id = $1
      ORDER BY a.class_date DESC
      `,
      [studentId]
    );


    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// GET STUDENT ATTENDANCE SUMMARY
// ======================================================

async function getStudentAttendanceSummary(req, res, next) {
  try {

    const student = await pool.query(
      `
      SELECT id
      FROM students
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    if (student.rows.length === 0) {
      return res.status(404).json({
        error: 'Student profile not found',
      });
    }

    const studentId = student.rows[0].id;


    const result = await pool.query(
      `
      SELECT
        s.id AS subject_id,
        s.name AS subject,
        s.code,

        COUNT(a.id) AS total_classes,

        COUNT(
          CASE
            WHEN a.status = 'present'
            THEN 1
          END
        ) AS present_classes,

        COUNT(
          CASE
            WHEN a.status = 'absent'
            THEN 1
          END
        ) AS absent_classes,

        CASE
          WHEN COUNT(a.id) = 0 THEN 0
          ELSE ROUND(
            (
              COUNT(
                CASE
                  WHEN a.status = 'present'
                  THEN 1
                END
              ) * 100.0
            ) / COUNT(a.id)
          )
        END AS attendance_percentage

      FROM subjects s

      LEFT JOIN attendance a
        ON a.subject_id = s.id
        AND a.student_id = $1

      GROUP BY
        s.id,
        s.name,
        s.code

      ORDER BY s.name
      `,
      [studentId]
    );


    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  getStudentsForAttendance,
  markAttendance,
  getStudentAttendance,
  getStudentAttendanceSummary,
};