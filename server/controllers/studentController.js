const pool = require('../config/db');

// ======================================================
// HELPER
// ======================================================

async function getStudentByUserId(userId) {
  const result = await pool.query(
    'SELECT * FROM students WHERE user_id = $1',
    [userId]
  );

  return result.rows[0];
}


// ======================================================
// GET STUDENT PROFILE
// ======================================================

async function getProfile(req, res, next) {
  try {
    const result = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name,
        u.email,
        d.name AS department,
        c.name AS course,
        sem.number AS semester,
        div.name AS division,
        ay.label AS academic_year
      FROM students s
      JOIN users u
        ON u.id = s.user_id
      LEFT JOIN departments d
        ON d.id = s.department_id
      LEFT JOIN courses c
        ON c.id = s.course_id
      LEFT JOIN semesters sem
        ON sem.id = s.current_semester_id
      LEFT JOIN divisions div
        ON div.id = s.division_id
      LEFT JOIN academic_years ay
        ON ay.id = s.academic_year_id
      WHERE u.id = $1
      `,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({
        error: 'Student profile not found'
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// GET STUDENT ATTENDANCE
// ======================================================

async function getAttendance(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found'
      });
    }

    const result = await pool.query(
      `
      SELECT
        sub.name AS subject,
        sub.code,
        COUNT(*) FILTER (
          WHERE a.status = 'present'
        ) AS present_count,
        COUNT(*) AS total_count
      FROM attendance a
      JOIN subjects sub
        ON sub.id = a.subject_id
      WHERE a.student_id = $1
      GROUP BY
        sub.id,
        sub.name,
        sub.code
      ORDER BY sub.name
      `,
      [student.id]
    );

    const bySubject = result.rows.map((r) => ({
      subject: r.subject,
      code: r.code,
      presentCount: Number(r.present_count),
      totalCount: Number(r.total_count),
      percentage:
        r.total_count > 0
          ? Number(
              (
                (Number(r.present_count) /
                  Number(r.total_count)) *
                100
              ).toFixed(2)
            )
          : 0
    }));

    const totalPresent = bySubject.reduce(
      (sum, s) => sum + s.presentCount,
      0
    );

    const totalClasses = bySubject.reduce(
      (sum, s) => sum + s.totalCount,
      0
    );

    const overall =
      totalClasses > 0
        ? Number(
            ((totalPresent / totalClasses) * 100).toFixed(2)
          )
        : 0;

    res.json({
      overallPercentage: overall,
      bySubject
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// GET STUDENT MARKS
// ======================================================

async function getMarks(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found'
      });
    }

    const result = await pool.query(
      `
      SELECT
        sub.name AS subject,
        sub.code,
        m.exam_type,
        m.max_marks,
        m.obtained_marks,
        m.grade
      FROM marks m
      JOIN subjects sub
        ON sub.id = m.subject_id
      WHERE m.student_id = $1
        AND m.published = TRUE
      ORDER BY
        sub.name,
        m.exam_type
      `,
      [student.id]
    );

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// GET STUDENT MARKSHEET
// ======================================================

async function getMarksheet(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found'
      });
    }

    const result = await pool.query(
      `
      SELECT
        ms.*,
        sem.number AS semester_number
      FROM marksheets ms
      JOIN semesters sem
        ON sem.id = ms.semester_id
      WHERE ms.student_id = $1
        AND ms.published_at IS NOT NULL
      ORDER BY sem.number
      `,
      [student.id]
    );

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}

// ======================================================
// GET ELECTIVE OPTIONS
// ======================================================

async function getElectiveOptions(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        code,
        credits,
        subject_category
      FROM subjects
      WHERE subject_category IN (
        'open_elective',
        'liberal_learning'
      )
      ORDER BY
        CASE
          WHEN subject_category = 'open_elective' THEN 1
          WHEN subject_category = 'liberal_learning' THEN 2
          ELSE 3
        END,
        name
    `);

    const openElectives = result.rows.filter(
      (subject) =>
        subject.subject_category === 'open_elective'
    );

    const liberalLearning = result.rows.filter(
      (subject) =>
        subject.subject_category === 'liberal_learning'
    );

    res.json({
      openElectives,
      liberalLearning
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// GET CURRENT STUDENT ELECTIVE CHOICE
// ======================================================

async function getElectiveChoice(req, res, next) {
  try {
    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found'
      });
    }

    const result = await pool.query(`
      SELECT
        sc.id,
        sc.student_id,

        sc.open_elective_subject_id,
        oe.name AS open_elective,
        oe.code AS open_elective_code,

        sc.lll_subject_id,
        ll.name AS liberal_learning,
        ll.code AS liberal_learning_code,

        sc.status,
        sc.approved_by,
        sc.created_at,
        sc.updated_at

      FROM subject_choices sc

      LEFT JOIN subjects oe
        ON oe.id = sc.open_elective_subject_id

      LEFT JOIN subjects ll
        ON ll.id = sc.lll_subject_id

      WHERE sc.student_id = $1

      ORDER BY sc.created_at DESC
      LIMIT 1
    `, [student.id]);

    res.json(result.rows[0] || null);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// SUBMIT ELECTIVE CHOICE
// ======================================================

async function submitElectiveChoice(req, res, next) {
  const client = await pool.connect();

  try {
    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found'
      });
    }

    const {
      openElectiveId,
      liberalLearningId
    } = req.body;

    // --------------------------------------------------
    // Validate input
    // --------------------------------------------------

    if (!openElectiveId || !liberalLearningId) {
      return res.status(400).json({
        error:
          'Please select both an Open Elective and a Liberal Learning subject'
      });
    }

    // --------------------------------------------------
    // Validate Open Elective
    // --------------------------------------------------

    const openResult = await client.query(
      `
      SELECT id
      FROM subjects
      WHERE id = $1
        AND subject_category = 'open_elective'
      `,
      [openElectiveId]
    );

    if (openResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid Open Elective subject'
      });
    }

    // --------------------------------------------------
    // Validate Liberal Learning
    // --------------------------------------------------

    const lllResult = await client.query(
      `
      SELECT id
      FROM subjects
      WHERE id = $1
        AND subject_category = 'liberal_learning'
      `,
      [liberalLearningId]
    );

    if (lllResult.rows.length === 0) {
      return res.status(400).json({
        error: 'Invalid Liberal Learning subject'
      });
    }

    // --------------------------------------------------
    // Check existing choice
    // --------------------------------------------------

    const existingResult = await client.query(
      `
      SELECT
        id,
        status
      FROM subject_choices
      WHERE student_id = $1
      LIMIT 1
      `,
      [student.id]
    );

    // --------------------------------------------------
    // Start transaction
    // --------------------------------------------------

    await client.query('BEGIN');

    let result;

    // --------------------------------------------------
    // Existing choice found
    // --------------------------------------------------

    if (existingResult.rows.length > 0) {

      const existingChoice = existingResult.rows[0];

      // Already pending
      if (existingChoice.status === 'pending') {

        await client.query('ROLLBACK');

        return res.status(400).json({
          error:
            'You already have a pending subject choice request.'
        });
      }

      // Already approved
      if (existingChoice.status === 'approved') {

        await client.query('ROLLBACK');

        return res.status(400).json({
          error:
            'Your subject choice has already been approved.'
        });
      }

      // ------------------------------------------------
      // Rejected → allow resubmission
      // ------------------------------------------------

      if (existingChoice.status === 'rejected') {

        result = await client.query(
          `
          UPDATE subject_choices
          SET
            open_elective_subject_id = $1,
            lll_subject_id = $2,
            status = 'pending',
            approved_by = NULL,
            created_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $3
          RETURNING id
          `,
          [
            openElectiveId,
            liberalLearningId,
            existingChoice.id
          ]
        );
      }

    } else {

      // ------------------------------------------------
      // First submission
      // ------------------------------------------------

      result = await client.query(
        `
        INSERT INTO subject_choices
        (
          student_id,
          open_elective_subject_id,
          lll_subject_id,
          status,
          approved_by
        )
        VALUES
        (
          $1,
          $2,
          $3,
          'pending',
          NULL
        )
        RETURNING id
        `,
        [
          student.id,
          openElectiveId,
          liberalLearningId
        ]
      );
    }

    // --------------------------------------------------
    // Commit
    // --------------------------------------------------

    await client.query('COMMIT');

    res.status(201).json({
      message:
        'Subject choice submitted successfully. Waiting for faculty approval.',
      choiceId: result.rows[0].id,
      status: 'pending'
    });

  } catch (err) {

    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
    }

    next(err);

  } finally {

    client.release();

  }
}
module.exports = {
  getProfile,
  getAttendance,
  getMarks,
  getMarksheet,

  getElectiveOptions,
  getElectiveChoice,
  submitElectiveChoice
};