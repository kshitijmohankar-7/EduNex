const pool = require('../config/db');

function gradePoint(percent) {
  if (percent >= 90) return 10;
  if (percent >= 80) return 9;
  if (percent >= 70) return 8;
  if (percent >= 60) return 7;
  if (percent >= 50) return 6;
  if (percent >= 45) return 5;
  if (percent >= 40) return 4;
  return 0;
}

async function getStudentAcademicMetrics(req, res, next) {
  try {
    const studentResult = await pool.query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student profile not found.' });
    const studentId = studentResult.rows[0].id;

    const result = await pool.query(`
      WITH ranked AS (
        SELECT m.student_id, m.subject_id, m.obtained_marks, m.max_marks, m.grade,
               m.exam_type, s.name AS subject, s.code, s.credits, s.semester_id,
               sem.number AS semester_number,
               ROW_NUMBER() OVER (
                 PARTITION BY m.subject_id
                 ORDER BY CASE m.exam_type
                   WHEN 'END SEMESTER' THEN 1
                   WHEN 'EXTERNAL' THEN 2
                   WHEN 'INTERNAL' THEN 3
                   WHEN 'CT2' THEN 4
                   WHEN 'CT1' THEN 5
                   ELSE 6 END,
                 m.created_at DESC, m.id DESC
               ) AS rn
        FROM marks m
        JOIN subjects s ON s.id = m.subject_id
        JOIN semesters sem ON sem.id = s.semester_id
        WHERE m.student_id = $1 AND m.published = TRUE
      )
      SELECT * FROM ranked WHERE rn = 1
      ORDER BY semester_number, subject
    `, [studentId]);

    const semesterMap = new Map();
    for (const row of result.rows) {
      const percentage = Number(row.max_marks) > 0
        ? (Number(row.obtained_marks) / Number(row.max_marks)) * 100
        : 0;
      const points = gradePoint(percentage);
      const credits = Number(row.credits || 0);
      const key = String(row.semester_id);
      if (!semesterMap.has(key)) semesterMap.set(key, {
        semesterId: row.semester_id,
        semesterNumber: Number(row.semester_number),
        totalCredits: 0,
        weightedPoints: 0,
        subjects: [],
      });
      const semester = semesterMap.get(key);
      semester.totalCredits += credits;
      semester.weightedPoints += points * credits;
      semester.subjects.push({
        subject: row.subject,
        code: row.code,
        credits,
        examTypeUsed: row.exam_type,
        percentage: Number(percentage.toFixed(2)),
        gradePoint: points,
      });
    }

    const semesters = Array.from(semesterMap.values()).sort((a, b) => a.semesterNumber - b.semesterNumber).map((s) => ({
      ...s,
      sgpa: s.totalCredits ? Number((s.weightedPoints / s.totalCredits).toFixed(2)) : 0,
    }));

    let cumulativeCredits = 0;
    let cumulativeWeighted = 0;
    semesters.forEach((s) => {
      cumulativeCredits += s.totalCredits;
      cumulativeWeighted += s.weightedPoints;
      s.cgpa = cumulativeCredits ? Number((cumulativeWeighted / cumulativeCredits).toFixed(2)) : 0;
      delete s.weightedPoints;
    });

    res.json({
      gradingScale: 'Percentage-based 10-point scale; weighted by subject credits.',
      semesters,
      currentCgpa: semesters.length ? semesters[semesters.length - 1].cgpa : 0,
    });
  } catch (err) { next(err); }
}

module.exports = { getStudentAcademicMetrics };
