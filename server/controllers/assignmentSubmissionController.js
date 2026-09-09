const pool = require('../config/db');

// ======================================================
// HELPER
// ======================================================

async function getStudentByUserId(userId) {
  const result = await pool.query(
    `
    SELECT id
    FROM students
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0];
}

async function getFacultyByUserId(userId) {
  const result = await pool.query(
    `
    SELECT id
    FROM faculty
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0];
}


// ======================================================
// STUDENT - SUBMIT ASSIGNMENT
// POST /api/assignment-submissions/:assignmentId
// ======================================================

async function submitAssignment(req, res, next) {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return res.status(400).json({
        error: 'Assignment ID is required',
      });
    }

    // --------------------------------------------------
    // Get student
    // --------------------------------------------------

    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found',
      });
    }

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
        error: 'Assignment not found',
      });
    }

    const assignment = assignmentResult.rows[0];

    // --------------------------------------------------
    // Check deadline
    // --------------------------------------------------

    if (assignment.deadline) {
      const deadline = new Date(assignment.deadline);

      if (new Date() > deadline) {
        return res.status(400).json({
          error: 'Assignment submission deadline has passed',
        });
      }
    }

    // --------------------------------------------------
    // Check file
    // --------------------------------------------------

    if (!req.file) {
      return res.status(400).json({
        error: 'Submission file is required',
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
      [assignmentId, student.id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        error: 'You have already submitted this assignment',
        status: existing.rows[0].status,
      });
    }

    // --------------------------------------------------
    // Create submission
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
      RETURNING
        id,
        assignment_id,
        student_id,
        file_path,
        status,
        submitted_at
      `,
      [
        assignmentId,
        student.id,
        req.file.path,
      ]
    );

    res.status(201).json({
      message:
        'Assignment submitted successfully. Waiting for faculty approval.',
      submission: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// FACULTY - GET SUBMISSIONS
// GET /api/assignment-submissions/:assignmentId
// ======================================================

async function getAssignmentSubmissions(req, res, next) {
  try {
    const { assignmentId } = req.params;

    if (!assignmentId) {
      return res.status(400).json({
        error: 'Assignment ID is required',
      });
    }

    // --------------------------------------------------
    // Get faculty
    // --------------------------------------------------

    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    // --------------------------------------------------
    // Verify assignment belongs to this faculty
    // --------------------------------------------------

    const assignmentResult = await pool.query(
      `
      SELECT
        a.id,
        a.title,
        a.subject_id
      FROM assignments a
      WHERE a.id = $1
        AND a.created_by = $2
      `,
      [assignmentId, faculty.id]
    );

    if (assignmentResult.rows.length === 0) {
      return res.status(403).json({
        error: 'You are not authorized to view these submissions',
      });
    }

    // --------------------------------------------------
    // Get submissions
    // --------------------------------------------------

    const result = await pool.query(
      `
      SELECT
        ass.id,
        ass.assignment_id,
        ass.student_id,
        s.student_code,
        u.full_name AS student_name,
        u.email,
        ass.file_path,
        ass.status,
        ass.marks_obtained,
        ass.submitted_at
      FROM assignment_submissions ass

      JOIN students s
        ON s.id = ass.student_id

      JOIN users u
        ON u.id = s.user_id

      WHERE ass.assignment_id = $1

      ORDER BY ass.submitted_at DESC
      `,
      [assignmentId]
    );

    res.json({
      assignment: assignmentResult.rows[0],
      submissions: result.rows,
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// FACULTY - APPROVE SUBMISSION
// PUT /api/assignment-submissions/:submissionId/approve
// ======================================================

async function approveAssignmentSubmission(req, res, next) {
  try {
    const { submissionId } = req.params;

    if (!submissionId) {
      return res.status(400).json({
        error: 'Submission ID is required',
      });
    }

    // --------------------------------------------------
    // Get faculty
    // --------------------------------------------------

    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    // --------------------------------------------------
    // Verify submission belongs to faculty assignment
    // --------------------------------------------------

    const submissionResult = await pool.query(
      `
      SELECT
        ass.id,
        ass.status,
        a.created_by
      FROM assignment_submissions ass

      JOIN assignments a
        ON a.id = ass.assignment_id

      WHERE ass.id = $1
      `,
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Submission not found',
      });
    }

    const submission = submissionResult.rows[0];

    if (Number(submission.created_by) !== Number(faculty.id)) {
      return res.status(403).json({
        error: 'You are not authorized to approve this submission',
      });
    }

    // --------------------------------------------------
    // Update status
    // --------------------------------------------------

    const result = await pool.query(
      `
      UPDATE assignment_submissions
      SET status = 'approved'
      WHERE id = $1
      RETURNING
        id,
        assignment_id,
        student_id,
        status,
        marks_obtained,
        submitted_at
      `,
      [submissionId]
    );

    res.json({
      message: 'Assignment submission approved',
      submission: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// FACULTY - REJECT SUBMISSION
// PUT /api/assignment-submissions/:submissionId/reject
// ======================================================

async function rejectAssignmentSubmission(req, res, next) {
  try {
    const { submissionId } = req.params;

    if (!submissionId) {
      return res.status(400).json({
        error: 'Submission ID is required',
      });
    }

    // --------------------------------------------------
    // Get faculty
    // --------------------------------------------------

    const faculty = await getFacultyByUserId(req.user.id);

    if (!faculty) {
      return res.status(404).json({
        error: 'Faculty profile not found',
      });
    }

    // --------------------------------------------------
    // Verify submission belongs to faculty assignment
    // --------------------------------------------------

    const submissionResult = await pool.query(
      `
      SELECT
        ass.id,
        ass.status,
        a.created_by
      FROM assignment_submissions ass

      JOIN assignments a
        ON a.id = ass.assignment_id

      WHERE ass.id = $1
      `,
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Submission not found',
      });
    }

    const submission = submissionResult.rows[0];

    if (Number(submission.created_by) !== Number(faculty.id)) {
      return res.status(403).json({
        error: 'You are not authorized to reject this submission',
      });
    }

    // --------------------------------------------------
    // Update status
    // --------------------------------------------------

    const result = await pool.query(
      `
      UPDATE assignment_submissions
      SET status = 'rejected'
      WHERE id = $1
      RETURNING
        id,
        assignment_id,
        student_id,
        status,
        marks_obtained,
        submitted_at
      `,
      [submissionId]
    );

    res.json({
      message: 'Assignment submission rejected',
      submission: result.rows[0],
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// STUDENT - GET OWN SUBMISSION
// GET /api/assignment-submissions/student/:assignmentId
// ======================================================

async function getStudentSubmission(req, res, next) {
  try {
    const { assignmentId } = req.params;

    const student = await getStudentByUserId(req.user.id);

    if (!student) {
      return res.status(404).json({
        error: 'Student profile not found',
      });
    }

    const result = await pool.query(
      `
      SELECT
        ass.id,
        ass.assignment_id,
        ass.student_id,
        ass.file_path,
        ass.status,
        ass.marks_obtained,
        ass.submitted_at
      FROM assignment_submissions ass
      WHERE ass.assignment_id = $1
        AND ass.student_id = $2
      `,
      [assignmentId, student.id]
    );

    res.json(result.rows[0] || null);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {
  submitAssignment,
  getAssignmentSubmissions,
  approveAssignmentSubmission,
  rejectAssignmentSubmission,
  getStudentSubmission,
};