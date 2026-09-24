const pool = require('../config/db');

async function listExamSchedule(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT e.id, e.subject_id, s.name AS subject_name, s.code AS subject_code,
             e.exam_type, e.exam_date, e.start_time, e.end_time, e.room,
             e.instructions, e.created_at, e.updated_at
      FROM exam_schedules e
      JOIN subjects s ON s.id = e.subject_id
      ORDER BY e.exam_date ASC, e.start_time ASC, s.name ASC
    `);
    res.json({ items: result.rows });
  } catch (error) { next(error); }
}

function validatePayload(body) {
  const subjectId = Number(body?.subjectId);
  const examType = String(body?.examType || 'END SEMESTER').trim().slice(0, 30);
  const examDate = String(body?.examDate || '').trim();
  const startTime = String(body?.startTime || '').trim();
  const endTime = String(body?.endTime || '').trim();
  const room = String(body?.room || '').trim().slice(0, 100);
  const instructions = String(body?.instructions || '').trim();
  if (!Number.isInteger(subjectId) || subjectId <= 0) return { error: 'Select a valid subject.' };
  if (!examDate || !startTime) return { error: 'Exam date and start time are required.' };
  if (endTime && endTime <= startTime) return { error: 'End time must be after start time.' };
  return { value: { subjectId, examType: examType || 'END SEMESTER', examDate, startTime, endTime: endTime || null, room: room || null, instructions: instructions || null } };
}

async function createExam(req, res, next) {
  try {
    const parsed = validatePayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    const subject = await pool.query('SELECT id FROM subjects WHERE id=$1', [v.subjectId]);
    if (!subject.rows.length) return res.status(400).json({ error: 'Subject not found.' });
    const result = await pool.query(
      `INSERT INTO exam_schedules(subject_id,exam_type,exam_date,start_time,end_time,room,instructions,created_by)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [v.subjectId,v.examType,v.examDate,v.startTime,v.endTime,v.room,v.instructions,req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) { next(error); }
}

async function updateExam(req, res, next) {
  try {
    const parsed = validatePayload(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const v = parsed.value;
    const result = await pool.query(
      `UPDATE exam_schedules
       SET subject_id=$1,exam_type=$2,exam_date=$3,start_time=$4,end_time=$5,room=$6,instructions=$7,updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [v.subjectId,v.examType,v.examDate,v.startTime,v.endTime,v.room,v.instructions,Number(req.params.id)]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Exam schedule entry not found.' });
    res.json(result.rows[0]);
  } catch (error) { next(error); }
}

async function deleteExam(req, res, next) {
  try {
    const result = await pool.query('DELETE FROM exam_schedules WHERE id=$1 RETURNING id', [Number(req.params.id)]);
    if (!result.rows.length) return res.status(404).json({ error: 'Exam schedule entry not found.' });
    res.json({ message: 'Exam schedule entry deleted.' });
  } catch (error) { next(error); }
}

module.exports = { listExamSchedule, createExam, updateExam, deleteExam };
