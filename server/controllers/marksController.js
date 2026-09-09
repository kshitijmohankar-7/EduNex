const pool = require('../config/db');


// ======================================================
// CONSTANTS
// ======================================================

const EXAM_TYPES = [
  'CT1',
  'CT2',
  'INTERNAL',
  'EXTERNAL',
  'END SEMESTER',
];


// ======================================================
// HELPER - GET FACULTY
// ======================================================

async function getFacultyByUserId(userId) {
  const result = await pool.query(
    `
    SELECT id
    FROM faculty
    WHERE user_id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
}


// ======================================================
// HELPER - CALCULATE GRADE
// ======================================================

function calculateGrade(obtained, max) {
  if (max <= 0) {
    return 'F';
  }

  const percentage = (obtained / max) * 100;

  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';

  return 'F';
}


// ======================================================
// HELPER
// DETERMINE WHETHER SUBJECT IS EXTERNAL ONLY
// ======================================================

function isExternalOnly(subject) {
  const name = String(subject.name || '').toLowerCase();
  const code = String(subject.code || '').toLowerCase();
  const category = String(
    subject.subject_category || ''
  ).toLowerCase();

  // Liberal Learning
  if (
    category === 'liberal_learning' ||
    code.startsWith('llm-') ||
    code.startsWith('llm')
  ) {
    return true;
  }

  // Micro Project
  if (
    name.includes('micro project') ||
    code.includes('micro')
  ) {
    return true;
  }

  // Labs
  if (
    name.includes('lab') ||
    code.includes('-lab') ||
    code.endsWith('lab')
  ) {
    return true;
  }

  return false;
}


// ======================================================
// FACULTY
// SEARCH STUDENTS
//
// GET /api/marks/students/search?search=kshitij
// ======================================================

async function searchStudents(req, res, next) {
  try {
    const search = String(
      req.query.search || ''
    ).trim();

    if (!search) {
      return res.json([]);
    }

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS student_name,
        u.email

      FROM students s

      JOIN users u
        ON u.id = s.user_id

      WHERE
        u.full_name ILIKE $1
        OR s.student_code ILIKE $1

      ORDER BY
        u.full_name ASC

      LIMIT 20
      `,
      [`%${search}%`]
    );

    res.json(result.rows);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// FACULTY
// GET ONE STUDENT
//
// GET /api/marks/student/:studentId
// ======================================================

async function getStudentForMarks(req, res, next) {
  try {
    const { studentId } = req.params;

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS student_name,
        u.email

      FROM students s

      JOIN users u
        ON u.id = s.user_id

      WHERE s.id = $1
      `,
      [studentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
      });
    }

    res.json(result.rows[0]);

  } catch (err) {
    next(err);
  }
}


// ======================================================
// FACULTY
// GET ONLY SUBJECTS IN WHICH STUDENT IS ENROLLED
//
// GET /api/marks/student/:studentId/subjects
// ======================================================

async function getStudentSubjects(req, res, next) {
  try {
    const { studentId } = req.params;

    // First check student
    const studentResult = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS student_name

      FROM students s

      JOIN users u
        ON u.id = s.user_id

      WHERE s.id = $1
      `,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
      });
    }


    // --------------------------------------------------
    // Get enrolled subjects
    // --------------------------------------------------

    const result = await pool.query(
      `
      SELECT
        sub.id,
        sub.name,
        sub.code,
        sub.credits,
        sub.subject_category

      FROM student_subjects ss

      JOIN subjects sub
        ON sub.id = ss.subject_id

      WHERE ss.student_id = $1

        AND (
          ss.status IS NULL
          OR ss.status = 'approved'
        )

      ORDER BY
        sub.code ASC
      `,
      [studentId]
    );


    const subjects = result.rows.map(
      (subject) => ({
        ...subject,

        externalOnly:
          isExternalOnly(subject),

        allowedExamTypes:
          isExternalOnly(subject)
            ? ['EXTERNAL']
            : EXAM_TYPES,
      })
    );


    res.json({
      student: studentResult.rows[0],
      subjects,
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// FACULTY
// GET EXISTING MARKS FOR STUDENT
//
// GET /api/marks/student/:studentId/marks?examType=CT1
// ======================================================

async function getStudentMarksForExam(
  req,
  res,
  next
) {
  try {
    const { studentId } = req.params;

    const examType = String(
      req.query.examType || ''
    ).trim().toUpperCase();


    if (!EXAM_TYPES.includes(examType)) {
      return res.status(400).json({
        error:
          'Invalid exam type. Allowed: CT1, CT2, INTERNAL, EXTERNAL, END SEMESTER',
      });
    }


    // --------------------------------------------------
    // Check student
    // --------------------------------------------------

    const studentResult = await pool.query(
      `
      SELECT
        s.id,
        s.student_code,
        u.full_name AS student_name

      FROM students s

      JOIN users u
        ON u.id = s.user_id

      WHERE s.id = $1
      `,
      [studentId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Student not found',
      });
    }


    // --------------------------------------------------
    // Get only enrolled subjects
    // --------------------------------------------------

    const subjectResult = await pool.query(
      `
      SELECT
        sub.id,
        sub.name,
        sub.code,
        sub.credits,
        sub.subject_category

      FROM student_subjects ss

      JOIN subjects sub
        ON sub.id = ss.subject_id

      WHERE ss.student_id = $1

        AND (
          ss.status IS NULL
          OR ss.status = 'approved'
        )

      ORDER BY sub.code ASC
      `,
      [studentId]
    );


    // --------------------------------------------------
    // Get existing marks
    // --------------------------------------------------

    const marksResult = await pool.query(
      `
      SELECT
        id,
        student_id,
        subject_id,
        exam_type,
        max_marks,
        obtained_marks,
        grade,
        published,
        created_at

      FROM marks

      WHERE student_id = $1
        AND exam_type = $2

      ORDER BY subject_id
      `,
      [
        studentId,
        examType,
      ]
    );


    const markMap = {};

    marksResult.rows.forEach(
      (mark) => {
        markMap[mark.subject_id] = mark;
      }
    );


    // --------------------------------------------------
    // Combine subjects + marks
    // --------------------------------------------------

    const subjects =
      subjectResult.rows.map(
        (subject) => {

          const externalOnly =
            isExternalOnly(subject);

          const existingMark =
            markMap[subject.id] || null;


          return {
            id: subject.id,
            name: subject.name,
            code: subject.code,
            credits: subject.credits,
            subject_category:
              subject.subject_category,

            externalOnly,

            allowedExamTypes:
              externalOnly
                ? ['EXTERNAL']
                : EXAM_TYPES,

            mark:
              existingMark
                ? {
                    id: existingMark.id,
                    maxMarks:
                      existingMark.max_marks,
                    obtainedMarks:
                      existingMark.obtained_marks,
                    grade:
                      existingMark.grade,
                    published:
                      existingMark.published,
                  }
                : null,
          };
        }
      );


    // --------------------------------------------------
    // Prevent invalid exam
    // --------------------------------------------------

    const invalidSubjects =
      subjects.filter(
        (subject) =>
          subject.externalOnly &&
          examType !== 'EXTERNAL'
      );


    res.json({
      student:
        studentResult.rows[0],

      examType,

      subjects,

      invalidSubjects:
        invalidSubjects.map(
          (subject) => ({
            id: subject.id,
            name: subject.name,
            code: subject.code,
          })
        ),
    });

  } catch (err) {
    next(err);
  }
}


// ======================================================
// FACULTY
// SAVE ALL MARKS FOR ONE STUDENT
//
// POST /api/marks/bulk
//
// BODY:
//
// {
//   studentId: 1,
//   examType: "CT1",
//   maxMarks: 20,
//   marks: [
//     {
//       subjectId: 2,
//       obtainedMarks: 17
//     }
//   ]
// }
// ======================================================

async function saveBulkMarks(
  req,
  res,
  next
) {
  const client =
    await pool.connect();

  try {

    const {
      studentId,
      examType,
      maxMarks,
      marks,
    } = req.body;


    // --------------------------------------------------
    // Basic validation
    // --------------------------------------------------

    if (!studentId) {
      return res.status(400).json({
        error: 'studentId is required',
      });
    }


    if (!examType) {
      return res.status(400).json({
        error: 'examType is required',
      });
    }


    const normalizedExamType =
      String(examType)
        .trim()
        .toUpperCase();


    if (
      !EXAM_TYPES.includes(
        normalizedExamType
      )
    ) {
      return res.status(400).json({
        error:
          'Invalid exam type',
      });
    }


    if (
      maxMarks === undefined ||
      maxMarks === null ||
      maxMarks === ''
    ) {
      return res.status(400).json({
        error:
          'Total marks are required',
      });
    }


    const max =
      Number(maxMarks);


    if (
      !Number.isFinite(max) ||
      max <= 0
    ) {
      return res.status(400).json({
        error:
          'Total marks must be greater than 0',
      });
    }


    if (!Array.isArray(marks)) {
      return res.status(400).json({
        error:
          'marks must be an array',
      });
    }


    // --------------------------------------------------
    // Find faculty
    // --------------------------------------------------

    const faculty =
      await getFacultyByUserId(
        req.user.id
      );


    if (!faculty) {
      return res.status(404).json({
        error:
          'Faculty profile not found',
      });
    }


    // --------------------------------------------------
    // Check student
    // --------------------------------------------------

    const student =
      await pool.query(
        `
        SELECT id
        FROM students
        WHERE id = $1
        `,
        [studentId]
      );


    if (
      student.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          'Student not found',
      });
    }


    // --------------------------------------------------
    // Get student's enrolled subjects
    // --------------------------------------------------

    const enrolledResult =
      await pool.query(
        `
        SELECT
          sub.id,
          sub.name,
          sub.code,
          sub.subject_category

        FROM student_subjects ss

        JOIN subjects sub
          ON sub.id = ss.subject_id

        WHERE ss.student_id = $1

          AND (
            ss.status IS NULL
            OR ss.status = 'approved'
          )
        `,
        [studentId]
      );


    const enrolledSubjects =
      enrolledResult.rows;


    const enrolledMap =
      new Map();


    enrolledSubjects.forEach(
      (subject) => {
        enrolledMap.set(
          Number(subject.id),
          subject
        );
      }
    );


    // --------------------------------------------------
    // Validate every mark
    // --------------------------------------------------

    const preparedMarks = [];


    for (
      const item of marks
    ) {

      if (
        !item ||
        !item.subjectId
      ) {
        continue;
      }


      const subjectId =
        Number(item.subjectId);


      const subject =
        enrolledMap.get(
          subjectId
        );


      if (!subject) {
        return res.status(400).json({
          error:
            `Subject ${subjectId} is not enrolled by this student`,
        });
      }


      // ----------------------------------------------
      // External-only subjects
      // ----------------------------------------------

      if (
        isExternalOnly(subject) &&
        normalizedExamType !==
          'EXTERNAL'
      ) {
        return res.status(400).json({
          error:
            `${subject.name} can only have EXTERNAL marks`,
        });
      }


      // ----------------------------------------------
      // Empty marks are ignored
      // ----------------------------------------------

      if (
        item.obtainedMarks ===
          undefined ||
        item.obtainedMarks ===
          null ||
        item.obtainedMarks === ''
      ) {
        continue;
      }


      const obtained =
        Number(
          item.obtainedMarks
        );


      if (
        !Number.isFinite(
          obtained
        )
      ) {
        return res.status(400).json({
          error:
            `Invalid marks for ${subject.name}`,
        });
      }


      if (
        obtained < 0 ||
        obtained > max
      ) {
        return res.status(400).json({
          error:
            `Marks for ${subject.name} must be between 0 and ${max}`,
        });
      }


      const grade =
        calculateGrade(
          obtained,
          max
        );


      preparedMarks.push({
        subjectId,
        obtained,
        grade,
      });
    }


    // --------------------------------------------------
    // Nothing entered
    // --------------------------------------------------

    if (
      preparedMarks.length === 0
    ) {
      return res.status(400).json({
        error:
          'Enter at least one mark before saving',
      });
    }


    // --------------------------------------------------
    // TRANSACTION
    // --------------------------------------------------

    await client.query(
      'BEGIN'
    );


    const savedMarks = [];


    for (
      const item of preparedMarks
    ) {

      // ----------------------------------------------
      // Check existing mark
      // ----------------------------------------------

      const existing =
        await client.query(
          `
          SELECT id
          FROM marks

          WHERE student_id = $1
            AND subject_id = $2
            AND exam_type = $3
          `,
          [
            studentId,
            item.subjectId,
            normalizedExamType,
          ]
        );


      // ----------------------------------------------
      // UPDATE
      // ----------------------------------------------

      if (
        existing.rows.length > 0
      ) {

        const updated =
          await client.query(
            `
            UPDATE marks

            SET
              max_marks = $1,
              obtained_marks = $2,
              grade = $3,
              entered_by = $4,
              published = false

            WHERE id = $5

            RETURNING
              id,
              student_id,
              subject_id,
              exam_type,
              max_marks,
              obtained_marks,
              grade,
              entered_by,
              published,
              created_at
            `,
            [
              max,
              item.obtained,
              item.grade,
              faculty.id,
              existing.rows[0].id,
            ]
          );


        savedMarks.push(
          updated.rows[0]
        );


      } else {

        // --------------------------------------------
        // INSERT
        // --------------------------------------------

        const inserted =
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
            (
              $1,
              $2,
              $3,
              $4,
              $5,
              $6,
              $7,
              false
            )

            RETURNING
              id,
              student_id,
              subject_id,
              exam_type,
              max_marks,
              obtained_marks,
              grade,
              entered_by,
              published,
              created_at
            `,
            [
              studentId,
              item.subjectId,
              normalizedExamType,
              max,
              item.obtained,
              item.grade,
              faculty.id,
            ]
          );


        savedMarks.push(
          inserted.rows[0]
        );
      }
    }


    await client.query(
      'COMMIT'
    );


    res.status(200).json({
      message:
        'Marks saved successfully',

      studentId,

      examType:
        normalizedExamType,

      totalMarks:
        max,

      savedCount:
        savedMarks.length,

      marks:
        savedMarks,
    });


  } catch (err) {

    await client.query(
      'ROLLBACK'
    );

    next(err);

  } finally {

    client.release();

  }
}


// ======================================================
// FACULTY
// PUBLISH SINGLE MARK
// ======================================================

async function publishMarks(
  req,
  res,
  next
) {
  try {

    const {
      markId,
    } = req.params;


    const faculty =
      await getFacultyByUserId(
        req.user.id
      );


    if (!faculty) {
      return res.status(404).json({
        error:
          'Faculty profile not found',
      });
    }


    const result =
      await pool.query(
        `
        UPDATE marks

        SET published = true

        WHERE id = $1
          AND entered_by = $2

        RETURNING *
        `,
        [
          markId,
          faculty.id,
        ]
      );


    if (
      result.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          'Mark not found or you are not authorized to publish it',
      });
    }


    res.json({
      message:
        'Mark published successfully',

      mark:
        result.rows[0],
    });


  } catch (err) {
    next(err);
  }
}


// ======================================================
// STUDENT
// GET OWN PUBLISHED MARKS
// ======================================================

async function getStudentMarks(
  req,
  res,
  next
) {
  try {

    const studentResult =
      await pool.query(
        `
        SELECT id
        FROM students
        WHERE user_id = $1
        `,
        [req.user.id]
      );


    if (
      studentResult.rows.length === 0
    ) {
      return res.status(404).json({
        error:
          'Student profile not found',
      });
    }


    const studentId =
      studentResult.rows[0].id;


    const result =
      await pool.query(
        `
        SELECT
          m.id,
          m.student_id,
          m.subject_id,
          m.exam_type,
          m.max_marks,
          m.obtained_marks,
          m.grade,
          m.published,
          m.created_at,

          s.name AS subject,
          s.code,
          s.credits

        FROM marks m

        JOIN subjects s
          ON s.id = m.subject_id

        WHERE m.student_id = $1
          AND m.published = true

        ORDER BY
          s.code ASC,
          m.exam_type ASC
        `,
        [studentId]
      );


    res.json(
      result.rows
    );


  } catch (err) {
    next(err);
  }
}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

  searchStudents,

  getStudentForMarks,

  getStudentSubjects,

  getStudentMarksForExam,

  saveBulkMarks,

  publishMarks,

  getStudentMarks,

};