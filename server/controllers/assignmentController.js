const pool = require('../config/db');


// ======================================================
// GET ASSIGNMENTS
// STUDENT
// ======================================================

async function getAssignments(req, res, next) {
  try {
    const { subjectId } = req.query;

    let query = `
      SELECT
        a.id,
        a.subject_id,
        a.title,
        a.description,
        a.file_path,
        a.file_type,
        a.issue_date,
        a.deadline,

        s.name AS subject,
        s.code,

        sub.id AS submission_id,
        sub.status AS submission_status,
        sub.submitted_at AS submission_date

      FROM assignments a

      JOIN subjects s
        ON s.id = a.subject_id

      LEFT JOIN students st
        ON st.user_id = $1

      LEFT JOIN assignment_submissions sub
        ON sub.assignment_id = a.id
        AND sub.student_id = st.id
    `;

    const values = [req.user.id];

    if (subjectId) {
      query += `
        WHERE a.subject_id = $2
      `;

      values.push(subjectId);
    }

    query += `
      ORDER BY a.deadline ASC, a.issue_date DESC
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// CREATE ASSIGNMENT
// FACULTY
// ======================================================

async function createAssignment(req, res, next) {
  try {

    const {
      subjectId,
      title,
      description,
      deadline
    } = req.body;


    // --------------------------------------------------
    // VALIDATION
    // --------------------------------------------------

    if (!subjectId || !title || !deadline) {
      return res.status(400).json({
        error: 'subjectId, title and deadline are required'
      });
    }


    // --------------------------------------------------
    // FILE CHECK
    // --------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        error: 'Assignment file is required'
      });
    }


    // --------------------------------------------------
    // CHECK SUBJECT
    // --------------------------------------------------

    const subjectResult = await pool.query(
      `
      SELECT id
      FROM subjects
      WHERE id = $1
      `,
      [subjectId]
    );

    if (subjectResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Subject not found'
      });
    }


    // --------------------------------------------------
    // CREATE ASSIGNMENT
    // --------------------------------------------------

    const result = await pool.query(
      `
      INSERT INTO assignments
      (
        subject_id,
        title,
        description,
        file_path,
        file_type,
        issue_date,
        deadline
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        CURRENT_TIMESTAMP,
        $6
      )
      RETURNING
        id,
        subject_id,
        title,
        description,
        file_path,
        file_type,
        issue_date,
        deadline
      `,
      [
        subjectId,
        title,
        description || null,
        req.file.path,
        req.file.mimetype,
        deadline
      ]
    );


    res.status(201).json({
      message: 'Assignment uploaded successfully',
      assignment: result.rows[0]
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// STUDENT SUBMITS ASSIGNMENT
// ======================================================

async function submitAssignment(req, res, next) {

  try {

    const { assignmentId } = req.params;


    // --------------------------------------------------
    // Find student profile
    // --------------------------------------------------

    const studentResult = await pool.query(
      `
      SELECT id
      FROM students
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Student profile not found'
      });
    }

    const studentId = studentResult.rows[0].id;


    // --------------------------------------------------
    // Check assignment
    // --------------------------------------------------

    const assignmentResult = await pool.query(
      `
      SELECT
        id,
        deadline
      FROM assignments
      WHERE id = $1
      `,
      [assignmentId]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Assignment not found'
      });
    }


    // --------------------------------------------------
    // Check deadline
    // --------------------------------------------------

    const deadline = new Date(
      assignmentResult.rows[0].deadline
    );

    if (new Date() > deadline) {
      return res.status(400).json({
        error: 'Assignment deadline has passed'
      });
    }


    // --------------------------------------------------
    // Check uploaded file
    // --------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        error: 'Please upload your assignment file'
      });
    }


    // --------------------------------------------------
    // Check existing submission
    // --------------------------------------------------

    const existing = await pool.query(
      `
      SELECT
        id,
        status
      FROM assignment_submissions
      WHERE assignment_id = $1
        AND student_id = $2
      `,
      [
        assignmentId,
        studentId
      ]
    );


    // --------------------------------------------------
    // Existing submission
    // --------------------------------------------------

    if (existing.rows.length > 0) {

      const submission = existing.rows[0];


      // Already waiting for approval
      if (submission.status === 'pending') {

        return res.status(400).json({
          error:
            'Your submission is already waiting for faculty approval'
        });

      }


      // Already approved
      if (submission.status === 'submitted') {

        return res.status(400).json({
          error:
            'This assignment has already been approved'
        });

      }


      // ------------------------------------------------
      // Rejected → allow resubmission
      // ------------------------------------------------

      if (submission.status === 'rejected') {

        const result = await pool.query(
          `
          UPDATE assignment_submissions
          SET
            file_path = $1,
            status = 'pending',
            submitted_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
          `,
          [
            req.file.path,
            submission.id
          ]
        );

        return res.status(200).json({

          message:
            'Assignment resubmitted successfully. Waiting for faculty approval.',

          submission: result.rows[0]

        });

      }

    }


    // --------------------------------------------------
    // New submission
    // --------------------------------------------------

    const result = await pool.query(
      `
      INSERT INTO assignment_submissions
      (
        assignment_id,
        student_id,
        file_path,
        status,
        submitted_at
      )
      VALUES
      (
        $1,
        $2,
        $3,
        'pending',
        CURRENT_TIMESTAMP
      )
      RETURNING *
      `,
      [
        assignmentId,
        studentId,
        req.file.path
      ]
    );


    res.status(201).json({

      message:
        'Assignment submitted successfully. Waiting for faculty approval.',

      submission: result.rows[0]

    });

  } catch (err) {

    next(err);

  }

}


// ======================================================
// FACULTY GET SUBMISSIONS
// ======================================================

async function getAssignmentSubmissions(req, res, next) {

  try {

    const { assignmentId } = req.params;


    const result = await pool.query(
      `
      SELECT

        sub.id,
        sub.assignment_id,
        sub.student_id,
        sub.file_path,
        sub.status,
        sub.marks_obtained,
        sub.submitted_at,

        a.title AS assignment_title,
        a.deadline,

        s.student_code,
        u.full_name AS student_name

      FROM assignment_submissions sub

      JOIN assignments a
        ON a.id = sub.assignment_id

      JOIN students s
        ON s.id = sub.student_id

      JOIN users u
        ON u.id = s.user_id

      WHERE sub.assignment_id = $1

      ORDER BY sub.submitted_at DESC
      `,
      [assignmentId]
    );


    res.json(result.rows);

  } catch (err) {

    next(err);

  }

}


// ======================================================
// FACULTY APPROVE SUBMISSION
// ======================================================

async function approveAssignmentSubmission(req, res, next) {

  try {

    const { submissionId } = req.params;


    const result = await pool.query(
      `
      UPDATE assignment_submissions

      SET status = 'submitted'

      WHERE id = $1
        AND status = 'pending'

      RETURNING *
      `,
      [submissionId]
    );


    if (result.rows.length === 0) {

      return res.status(404).json({
        error: 'Pending submission not found'
      });

    }


    res.json({

      message:
        'Assignment submission approved',

      submission:
        result.rows[0]

    });

  } catch (err) {

    next(err);

  }

}


// ======================================================
// FACULTY REJECT SUBMISSION
// ======================================================

async function rejectAssignmentSubmission(req, res, next) {

  try {

    const { submissionId } = req.params;


    const result = await pool.query(
      `
      UPDATE assignment_submissions

      SET status = 'rejected'

      WHERE id = $1
        AND status = 'pending'

      RETURNING *
      `,
      [submissionId]
    );


    if (result.rows.length === 0) {

      return res.status(404).json({
        error: 'Pending submission not found'
      });

    }


    res.json({

      message:
        'Assignment submission rejected',

      submission:
        result.rows[0]

    });

  } catch (err) {

    next(err);

  }

}
// ======================================================
// FACULTY - GET OWN ASSIGNMENTS
// ======================================================

async function getFacultyAssignments(req, res, next) {
  try {

    // Find faculty profile
    const facultyResult = await pool.query(
      `
      SELECT id
      FROM faculty
      WHERE user_id = $1
      `,
      [req.user.id]
    );

    if (facultyResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Faculty profile not found'
      });
    }

    const facultyId = facultyResult.rows[0].id;

    // Get assignments uploaded by this faculty
    const result = await pool.query(
      `
      SELECT
        a.id,
        a.subject_id,
        a.title,
        a.description,
        a.instructions,
        a.file_path,
        a.file_name,
        a.file_type,
        a.issue_date,
        a.deadline,

        s.name AS subject,
        s.code,

        COUNT(sub.id) AS submission_count

      FROM assignments a

      JOIN subjects s
        ON s.id = a.subject_id

      LEFT JOIN assignment_submissions sub
        ON sub.assignment_id = a.id

      WHERE a.uploaded_by = $1

      GROUP BY
        a.id,
        a.subject_id,
        a.title,
        a.description,
        a.instructions,
        a.file_path,
        a.file_name,
        a.file_type,
        a.issue_date,
        a.deadline,
        s.name,
        s.code

      ORDER BY
        a.deadline ASC,
        a.issue_date DESC
      `,
      [facultyId]
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
  getAssignments,
  getFacultyAssignments,
  createAssignment,
  submitAssignment,
  getAssignmentSubmissions,
  approveAssignmentSubmission,
  rejectAssignmentSubmission
};