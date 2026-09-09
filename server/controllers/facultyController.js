const pool = require('../config/db');

// ======================================================
// GET FACULTY BY USER ID
// ======================================================

async function getFacultyByUserId(userId) {
  const result = await pool.query(
    'SELECT * FROM faculty WHERE user_id = $1',
    [userId]
  );

  return result.rows[0];
}


// ======================================================
// CHECK FACULTY SUBJECT ASSIGNMENT
// ======================================================

async function assertAssignedToSubject(facultyId, subjectId) {
  const result = await pool.query(
    `
    SELECT 1
    FROM faculty_subject_assignments
    WHERE faculty_id = $1
      AND subject_id = $2
    `,
    [facultyId, subjectId]
  );

  return result.rows.length > 0;
}


// ======================================================
// GET ASSIGNED STUDENTS
// GET /api/faculty/students?subjectId=&divisionId=
// ======================================================

async function getAssignedStudents(req, res, next) {
  try {
    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const { subjectId, divisionId } = req.query;

    if (!subjectId) {
      return res.status(400).json({
        error: 'subjectId is required',
      });
    }

    const allowed = await assertAssignedToSubject(
      faculty.id,
      subjectId
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'You are not assigned to this subject',
      });
    }

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS name,

        COUNT(a.id) AS total_classes,

        COUNT(
          CASE
            WHEN a.status = 'present'
            THEN 1
          END
        ) AS present_classes,

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
        END AS attendance,

        COALESCE(
          MAX(
            CASE
              WHEN m.exam_type = 'ct2'
              THEN m.obtained_marks
            END
          ),
          0
        ) AS ct2

      FROM students s

      JOIN users u
        ON u.id = s.user_id

      LEFT JOIN attendance a
        ON a.student_id = s.id
        AND a.subject_id = $1

      LEFT JOIN marks m
        ON m.student_id = s.id
        AND m.subject_id = $1
        AND m.exam_type = 'ct2'
        AND m.published = TRUE

      WHERE
        ($2::int IS NULL OR s.division_id = $2)

      GROUP BY
        s.id,
        s.student_code,
        u.full_name

      ORDER BY
        s.student_code
      `,
      [
        subjectId,
        divisionId || null,
      ]
    );

    const students = result.rows.map((student) => {
      const attendance = Number(student.attendance || 0);
      const ct2 = Number(student.ct2 || 0);

      let trend = 'stable';

      if (attendance >= 85 && ct2 >= 70) {
        trend = 'improving';
      } else if (attendance < 75 || ct2 < 50) {
        trend = 'declining';
      }

      return {
        ...student,
        attendance,
        ct2,
        trend,
      };
    });

    res.json(students);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// MARK ATTENDANCE
// POST /api/faculty/attendance
// ======================================================

async function markAttendance(req, res, next) {
  const client = await pool.connect();

  try {
    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const {
      subjectId,
      classDate,
      records,
    } = req.body;

    if (
      !subjectId ||
      !classDate ||
      !Array.isArray(records)
    ) {
      return res.status(400).json({
        error:
          'subjectId, classDate and records[] are required',
      });
    }

    const allowed = await assertAssignedToSubject(
      faculty.id,
      subjectId
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'You are not assigned to this subject',
      });
    }

    await client.query('BEGIN');

    for (const r of records) {
      await client.query(
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
        ($1, $2, $3, $4, $5)

        ON CONFLICT
        (
          student_id,
          subject_id,
          class_date
        )

        DO UPDATE SET
          status = EXCLUDED.status,
          marked_by = EXCLUDED.marked_by
        `,
        [
          r.studentId,
          subjectId,
          classDate,
          r.status,
          faculty.id,
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Attendance recorded',
      count: records.length,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);

  } finally {
    client.release();
  }
}


// ======================================================
// ENTER MARKS
// POST /api/faculty/marks
// ======================================================

async function enterMarks(req, res, next) {
  const client = await pool.connect();

  try {
    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const {
      subjectId,
      examType,
      entries,
    } = req.body;

    const validTypes = [
      'ct1',
      'ct2',
      'class_assessment',
      'end_sem',
    ];

    if (
      !subjectId ||
      !validTypes.includes(examType) ||
      !Array.isArray(entries)
    ) {
      return res.status(400).json({
        error:
          'subjectId, a valid examType, and entries[] are required',
      });
    }

    const allowed = await assertAssignedToSubject(
      faculty.id,
      subjectId
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'You are not assigned to this subject',
      });
    }

    await client.query('BEGIN');

    for (const e of entries) {
      await client.query(
        `
        INSERT INTO marks
        (
          student_id,
          subject_id,
          exam_type,
          max_marks,
          obtained_marks,
          grade,
          entered_by,
          published
        )
        VALUES
        ($1, $2, $3, $4, $5, $6, $7, FALSE)

        ON CONFLICT
        (
          student_id,
          subject_id,
          exam_type
        )

        DO UPDATE SET
          max_marks = EXCLUDED.max_marks,
          obtained_marks = EXCLUDED.obtained_marks,
          grade = EXCLUDED.grade,
          entered_by = EXCLUDED.entered_by
        `,
        [
          e.studentId,
          subjectId,
          examType,
          e.maxMarks,
          e.obtainedMarks,
          e.grade || null,
          faculty.id,
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      message: 'Marks saved as draft (unpublished)',
      count: entries.length,
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);

  } finally {
    client.release();
  }
}


// ======================================================
// PUBLISH MARKS
// POST /api/faculty/marks/publish
// ======================================================

async function publishMarks(req, res, next) {
  try {
    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const {
      subjectId,
      examType,
      studentIds,
    } = req.body;

    if (
      !subjectId ||
      !examType ||
      !Array.isArray(studentIds)
    ) {
      return res.status(400).json({
        error:
          'subjectId, examType and studentIds[] are required',
      });
    }

    const allowed = await assertAssignedToSubject(
      faculty.id,
      subjectId
    );

    if (!allowed) {
      return res.status(403).json({
        error: 'You are not assigned to this subject',
      });
    }

    await pool.query(
      `
      UPDATE marks
      SET published = TRUE

      WHERE subject_id = $1
        AND exam_type = $2
        AND student_id = ANY($3::int[])
      `,
      [
        subjectId,
        examType,
        studentIds,
      ]
    );

    res.json({
      message: 'Marks published to students',
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// GET SUBJECT CHOICE REQUESTS
// GET /api/faculty/subject-choices
// ======================================================

async function getSubjectChoices(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT
        sc.id,
        sc.student_id,

        s.student_code,

        u.full_name AS student_name,

        sc.open_elective_subject_id,

        oe.name AS open_elective,

        oe.code AS open_elective_code,

        sc.lll_subject_id,

        ll.name AS liberal_learning,

        ll.code AS liberal_learning_code,

        sc.status,

        sc.approved_by,

        sc.created_at

      FROM subject_choices sc

      JOIN students s
        ON s.id = sc.student_id

      JOIN users u
        ON u.id = s.user_id

      LEFT JOIN subjects oe
        ON oe.id = sc.open_elective_subject_id

      LEFT JOIN subjects ll
        ON ll.id = sc.lll_subject_id

      WHERE sc.status = 'pending'

      ORDER BY sc.created_at ASC
      `
    );

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// APPROVE SUBJECT CHOICE
// POST /api/faculty/subject-choices/:choiceId/approve
// ======================================================

async function approveSubjectChoice(req, res, next) {
  const client = await pool.connect();

  try {
    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const { choiceId } = req.params;

    if (!choiceId) {
      return res.status(400).json({
        error: 'choiceId is required',
      });
    }

    const choiceResult = await client.query(
      `
      SELECT
        id,
        student_id,
        open_elective_subject_id,
        lll_subject_id,
        status

      FROM subject_choices

      WHERE id = $1
      `,
      [choiceId]
    );

    if (choiceResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Subject choice request not found',
      });
    }

    const choice = choiceResult.rows[0];

    if (choice.status !== 'pending') {
      return res.status(400).json({
        error: 'This request has already been processed',
      });
    }

    await client.query('BEGIN');

    // ----------------------------------------------
    // APPROVE REQUEST
    // ----------------------------------------------

    await client.query(
      `
      UPDATE subject_choices

      SET
        status = 'approved',
        approved_by = $1,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $2
      `,
      [
        faculty.id,
        choiceId,
      ]
    );


    // ----------------------------------------------
    // ADD OPEN ELECTIVE
    // ----------------------------------------------

    if (choice.open_elective_subject_id) {
      await client.query(
        `
        INSERT INTO student_subjects
        (
          student_id,
          subject_id,
          status
        )

        VALUES
        (
          $1,
          $2,
          'approved'
        )

        ON CONFLICT
        (
          student_id,
          subject_id
        )

        DO NOTHING
        `,
        [
          choice.student_id,
          choice.open_elective_subject_id,
        ]
      );
    }


    // ----------------------------------------------
    // ADD LIBERAL LEARNING
    // ----------------------------------------------

    if (choice.lll_subject_id) {
      await client.query(
        `
        INSERT INTO student_subjects
        (
          student_id,
          subject_id,
          status
        )

        VALUES
        (
          $1,
          $2,
          'approved'
        )

        ON CONFLICT
        (
          student_id,
          subject_id
        )

        DO NOTHING
        `,
        [
          choice.student_id,
          choice.lll_subject_id,
        ]
      );
    }

    await client.query('COMMIT');

    res.json({
      message:
        'Subject choice approved successfully',
    });

  } catch (err) {
    await client.query('ROLLBACK');
    next(err);

  } finally {
    client.release();
  }
}


// ======================================================
// REJECT SUBJECT CHOICE
// POST /api/faculty/subject-choices/:choiceId/reject
// ======================================================

async function rejectSubjectChoice(req, res, next) {
  try {
    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    const { choiceId } = req.params;

    if (!choiceId) {
      return res.status(400).json({
        error: 'choiceId is required',
      });
    }

    const result = await pool.query(
      `
      UPDATE subject_choices

      SET
        status = 'rejected',
        approved_by = $1,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $2
        AND status = 'pending'

      RETURNING id
      `,
      [
        faculty.id,
        choiceId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error:
          'Pending subject choice request not found',
      });
    }

    res.json({
      message:
        'Subject choice request rejected',
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  getAssignedStudents,
  markAttendance,
  enterMarks,
  publishMarks,

  getFacultyByUserId,
  assertAssignedToSubject,

  getSubjectChoices,
  approveSubjectChoice,
  rejectSubjectChoice,
};