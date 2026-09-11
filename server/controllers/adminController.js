const bcrypt = require('bcryptjs');
const pool = require('../config/db');

async function audit(userId, action, entity, entityId, details = {}) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity, entity_id, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, entity, entityId || null, details]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

async function getOverview(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM departments) AS departments,
        (SELECT COUNT(*) FROM courses) AS courses,
        (SELECT COUNT(*) FROM faculty f JOIN users u ON u.id = f.user_id WHERE u.is_active = TRUE) AS active_faculty,
        (SELECT COUNT(*) FROM students s JOIN users u ON u.id = s.user_id WHERE u.is_active = TRUE) AS active_students,
        (SELECT COUNT(*) FROM subjects) AS subjects,
        (SELECT COUNT(*) FROM assignments) AS assignments,
        (SELECT COUNT(*) FROM announcements) AS announcements
    `);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
}

async function listPeople(req, res, next) {
  try {
    const role = String(req.query.role || '').trim();
    const params = [];
    let where = '';
    if (role === 'student' || role === 'faculty') {
      params.push(role);
      where = 'WHERE u.role = $1';
    }

    const result = await pool.query(`
      SELECT u.id, u.email, u.full_name, u.role, u.is_active, u.created_at,
             s.student_code, s.department_id AS student_department_id,
             s.course_id, s.current_semester_id, s.division_id, s.academic_year_id,
             f.faculty_code, f.department_id AS faculty_department_id,
             d_student.name AS student_department,
             d_faculty.name AS faculty_department
      FROM users u
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN faculty f ON f.user_id = u.id
      LEFT JOIN departments d_student ON d_student.id = s.department_id
      LEFT JOIN departments d_faculty ON d_faculty.id = f.department_id
      ${where}
      ORDER BY u.role, u.full_name
    `, params);

    res.json(result.rows);
  } catch (err) { next(err); }
}

async function createPerson(req, res, next) {
  const client = await pool.connect();
  try {
    const {
      role, fullName, email, password,
      studentCode, departmentId, courseId, semesterId, divisionId, academicYearId,
      facultyCode,
    } = req.body;

    if (!['student', 'faculty'].includes(role)) {
      return res.status(400).json({ error: 'Only student or faculty accounts can be created here.' });
    }
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, login ID (email), and password are required.' });
    }
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    if (role === 'student' && (!studentCode || !departmentId || !courseId || !semesterId || !divisionId || !academicYearId)) {
      return res.status(400).json({ error: 'Student code, department, course, semester, division and academic year are required.' });
    }
    if (role === 'faculty' && (!facultyCode || !departmentId)) {
      return res.status(400).json({ error: 'Faculty code and department are required.' });
    }

    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (existing.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A user with this login ID already exists.' });
    }

    if (role === 'student') {
      const refs = await client.query(`
        SELECT
          EXISTS(SELECT 1 FROM departments WHERE id = $1) AS department_ok,
          EXISTS(SELECT 1 FROM courses WHERE id = $2 AND department_id = $1) AS course_ok,
          EXISTS(SELECT 1 FROM semesters WHERE id = $3 AND course_id = $2) AS semester_ok,
          EXISTS(SELECT 1 FROM divisions WHERE id = $4 AND semester_id = $3) AS division_ok,
          EXISTS(SELECT 1 FROM academic_years WHERE id = $5) AS year_ok
      `, [departmentId, courseId, semesterId, divisionId, academicYearId]);
      const r = refs.rows[0];
      if (!r.department_ok || !r.course_ok || !r.semester_ok || !r.division_ok || !r.year_ok) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid student academic structure selection.' });
      }
    } else {
      const dept = await client.query('SELECT id FROM departments WHERE id = $1', [departmentId]);
      if (!dept.rows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'Department not found.' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, is_active)
       VALUES ($1, $2, $3, $4, TRUE)
       RETURNING id, email, role, full_name, is_active`,
      [email.trim().toLowerCase(), passwordHash, role, fullName.trim()]
    );
    const user = userResult.rows[0];

    let profile;
    if (role === 'student') {
      const result = await client.query(
        `INSERT INTO students
          (user_id, student_code, department_id, course_id, current_semester_id, division_id, academic_year_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [user.id, studentCode.trim(), departmentId, courseId, semesterId, divisionId, academicYearId]
      );
      profile = result.rows[0];
    } else {
      const result = await client.query(
        `INSERT INTO faculty (user_id, faculty_code, department_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [user.id, facultyCode.trim(), departmentId]
      );
      profile = result.rows[0];
    }

    await client.query('COMMIT');
    await audit(req.user.id, `Created ${role} account`, role, user.id, { email: user.email });
    res.status(201).json({ message: `${role === 'student' ? 'Student' : 'Faculty'} account created successfully.`, user, profile });
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    if (err.code === '23505') return res.status(409).json({ error: 'The login ID or profile code is already in use.' });
    next(err);
  } finally { client.release(); }
}

async function updatePerson(req, res, next) {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid user id.' });
    const { fullName, email, password, isActive } = req.body;

    const current = await client.query('SELECT id, role FROM users WHERE id = $1', [id]);
    if (!current.rows.length) return res.status(404).json({ error: 'User not found.' });
    if (!['student', 'faculty'].includes(current.rows[0].role)) return res.status(400).json({ error: 'Only student and faculty accounts are managed here.' });

    await client.query('BEGIN');
    const updates = [];
    const values = [];
    let index = 1;
    if (fullName !== undefined) { updates.push(`full_name = $${index++}`); values.push(String(fullName).trim()); }
    if (email !== undefined) { updates.push(`email = $${index++}`); values.push(String(email).trim().toLowerCase()); }
    if (isActive !== undefined) { updates.push(`is_active = $${index++}`); values.push(Boolean(isActive)); }
    if (password) {
      if (String(password).length < 8) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Password must be at least 8 characters.' }); }
      updates.push(`password_hash = $${index++}`); values.push(await bcrypt.hash(String(password), 12));
    }
    if (!updates.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'No account changes supplied.' }); }
    values.push(id);
    const result = await client.query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${index}
       RETURNING id, email, role, full_name, is_active, updated_at`,
      values
    );
    await client.query('COMMIT');
    await audit(req.user.id, `Updated ${result.rows[0].role} account`, result.rows[0].role, id, { fields: updates.map((x) => x.split(' = ')[0]) });
    res.json(result.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    if (err.code === '23505') return res.status(409).json({ error: 'That login ID is already in use.' });
    next(err);
  } finally { client.release(); }
}

async function deactivatePerson(req, res, next) {
  try {
    const id = Number(req.params.id);
    const result = await pool.query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW()
       WHERE id = $1 AND role IN ('student','faculty')
       RETURNING id, email, role, full_name, is_active`, [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Student/faculty account not found.' });
    await audit(req.user.id, `Deactivated ${result.rows[0].role} account`, result.rows[0].role, id);
    res.json({ message: 'Account deactivated.', user: result.rows[0] });
  } catch (err) { next(err); }
}

async function listDepartments(req, res, next) {
  try { const r = await pool.query('SELECT id, name, code FROM departments ORDER BY name'); res.json(r.rows); } catch (err) { next(err); }
}
async function createDepartment(req, res, next) {
  try {
    const { name, code } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Department name and code are required.' });
    const r = await pool.query('INSERT INTO departments (name, code) VALUES ($1, $2) RETURNING *', [name.trim(), code.trim().toUpperCase()]);
    await audit(req.user.id, 'Created department', 'department', r.rows[0].id, r.rows[0]);
    res.status(201).json(r.rows[0]);
  } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'Department code already exists.' }); next(err); }
}
async function updateDepartment(req, res, next) {
  try { const r = await pool.query('UPDATE departments SET name=$1, code=$2 WHERE id=$3 RETURNING *', [String(req.body.name || '').trim(), String(req.body.code || '').trim().toUpperCase(), Number(req.params.id)]); if (!r.rows.length) return res.status(404).json({ error: 'Department not found.' }); res.json(r.rows[0]); } catch (err) { if (err.code === '23505') return res.status(409).json({ error: 'Department code already exists.' }); next(err); }
}
async function deleteDepartment(req, res, next) {
  try { const id = Number(req.params.id); const refs = await pool.query(`SELECT EXISTS(SELECT 1 FROM courses WHERE department_id=$1) OR EXISTS(SELECT 1 FROM students WHERE department_id=$1) OR EXISTS(SELECT 1 FROM faculty WHERE department_id=$1) AS used`, [id]); if (refs.rows[0]?.used) return res.status(409).json({ error: 'Department is in use. Move its courses, students and faculty before deleting it.' }); const r = await pool.query('DELETE FROM departments WHERE id=$1 RETURNING id', [id]); if (!r.rows.length) return res.status(404).json({ error: 'Department not found.' }); res.json({ message: 'Department deleted.' }); } catch (err) { next(err); }
}

async function listCourses(req, res, next) { try { const r = await pool.query(`SELECT c.id,c.name,c.duration_years,c.department_id,d.name AS department FROM courses c LEFT JOIN departments d ON d.id=c.department_id ORDER BY d.name,c.name`); res.json(r.rows); } catch (err) { next(err); } }
async function createCourse(req, res, next) { try { const { name, durationYears, departmentId }=req.body; if(!name||!durationYears||!departmentId)return res.status(400).json({error:'Course name, duration and department are required.'}); const r=await pool.query('INSERT INTO courses (department_id,name,duration_years) VALUES ($1,$2,$3) RETURNING *',[departmentId,name.trim(),durationYears]); res.status(201).json(r.rows[0]); } catch(err){next(err);} }
async function updateCourse(req,res,next){try{const r=await pool.query('UPDATE courses SET department_id=$1,name=$2,duration_years=$3 WHERE id=$4 RETURNING *',[req.body.departmentId,String(req.body.name||'').trim(),req.body.durationYears,Number(req.params.id)]);if(!r.rows.length)return res.status(404).json({error:'Course not found.'});res.json(r.rows[0]);}catch(err){next(err);}}
async function deleteCourse(req,res,next){try{const id=Number(req.params.id);const refs=await pool.query(`SELECT EXISTS(SELECT 1 FROM semesters WHERE course_id=$1) OR EXISTS(SELECT 1 FROM students WHERE course_id=$1) AS used`,[id]);if(refs.rows[0]?.used)return res.status(409).json({error:'Course is in use and cannot be deleted.'});const r=await pool.query('DELETE FROM courses WHERE id=$1 RETURNING id',[id]);if(!r.rows.length)return res.status(404).json({error:'Course not found.'});res.json({message:'Course deleted.'});}catch(err){next(err);}}

async function listAcademicYears(req,res,next){try{const r=await pool.query('SELECT id,label FROM academic_years ORDER BY label DESC');res.json(r.rows);}catch(err){next(err);}}
async function createAcademicYear(req,res,next){try{const label=String(req.body.label||'').trim();if(!label)return res.status(400).json({error:'Academic year label is required.'});const r=await pool.query('INSERT INTO academic_years(label) VALUES($1) RETURNING *',[label]);res.status(201).json(r.rows[0]);}catch(err){next(err);}}
async function updateAcademicYear(req,res,next){try{const r=await pool.query('UPDATE academic_years SET label=$1 WHERE id=$2 RETURNING *',[String(req.body.label||'').trim(),Number(req.params.id)]);if(!r.rows.length)return res.status(404).json({error:'Academic year not found.'});res.json(r.rows[0]);}catch(err){next(err);}}
async function deleteAcademicYear(req,res,next){try{const id=Number(req.params.id);const refs=await pool.query('SELECT EXISTS(SELECT 1 FROM students WHERE academic_year_id=$1) AS used',[id]);if(refs.rows[0]?.used)return res.status(409).json({error:'Academic year is assigned to students.'});const r=await pool.query('DELETE FROM academic_years WHERE id=$1 RETURNING id',[id]);if(!r.rows.length)return res.status(404).json({error:'Academic year not found.'});res.json({message:'Academic year deleted.'});}catch(err){next(err);}}

async function listSemesters(req,res,next){try{const r=await pool.query(`SELECT sem.id,sem.number,sem.course_id,c.name AS course,d.name AS department FROM semesters sem LEFT JOIN courses c ON c.id=sem.course_id LEFT JOIN departments d ON d.id=c.department_id ORDER BY d.name,c.name,sem.number`);res.json(r.rows);}catch(err){next(err);}}
async function createSemester(req,res,next){try{const {courseId,number}=req.body;if(!courseId||!number)return res.status(400).json({error:'Course and semester number are required.'});const r=await pool.query('INSERT INTO semesters(course_id,number) VALUES($1,$2) RETURNING *',[courseId,number]);res.status(201).json(r.rows[0]);}catch(err){if(err.code==='23505')return res.status(409).json({error:'That semester already exists for this course.'});next(err);}}
async function updateSemester(req,res,next){try{const r=await pool.query('UPDATE semesters SET course_id=$1,number=$2 WHERE id=$3 RETURNING *',[req.body.courseId,req.body.number,Number(req.params.id)]);if(!r.rows.length)return res.status(404).json({error:'Semester not found.'});res.json(r.rows[0]);}catch(err){next(err);}}
async function deleteSemester(req,res,next){try{const id=Number(req.params.id);const refs=await pool.query(`SELECT EXISTS(SELECT 1 FROM divisions WHERE semester_id=$1) OR EXISTS(SELECT 1 FROM subjects WHERE semester_id=$1) OR EXISTS(SELECT 1 FROM students WHERE current_semester_id=$1) AS used`,[id]);if(refs.rows[0]?.used)return res.status(409).json({error:'Semester is in use and cannot be deleted.'});const r=await pool.query('DELETE FROM semesters WHERE id=$1 RETURNING id',[id]);if(!r.rows.length)return res.status(404).json({error:'Semester not found.'});res.json({message:'Semester deleted.'});}catch(err){next(err);}}

async function listDivisions(req,res,next){try{const r=await pool.query(`SELECT v.id,v.name,v.semester_id,sem.number AS semester_number,c.name AS course FROM divisions v LEFT JOIN semesters sem ON sem.id=v.semester_id LEFT JOIN courses c ON c.id=sem.course_id ORDER BY c.name,sem.number,v.name`);res.json(r.rows);}catch(err){next(err);}}
async function createDivision(req,res,next){try{const {semesterId,name}=req.body;if(!semesterId||!name)return res.status(400).json({error:'Semester and division name are required.'});const r=await pool.query('INSERT INTO divisions(semester_id,name) VALUES($1,$2) RETURNING *',[semesterId,String(name).trim()]);res.status(201).json(r.rows[0]);}catch(err){next(err);}}
async function updateDivision(req,res,next){try{const r=await pool.query('UPDATE divisions SET semester_id=$1,name=$2 WHERE id=$3 RETURNING *',[req.body.semesterId,String(req.body.name||'').trim(),Number(req.params.id)]);if(!r.rows.length)return res.status(404).json({error:'Division not found.'});res.json(r.rows[0]);}catch(err){next(err);}}
async function deleteDivision(req,res,next){try{const id=Number(req.params.id);const refs=await pool.query(`SELECT EXISTS(SELECT 1 FROM students WHERE division_id=$1) OR EXISTS(SELECT 1 FROM faculty_subject_assignments WHERE division_id=$1) AS used`,[id]);if(refs.rows[0]?.used)return res.status(409).json({error:'Division is in use and cannot be deleted.'});const r=await pool.query('DELETE FROM divisions WHERE id=$1 RETURNING id',[id]);if(!r.rows.length)return res.status(404).json({error:'Division not found.'});res.json({message:'Division deleted.'});}catch(err){next(err);}}

async function listSubjects(req,res,next){try{const r=await pool.query(`SELECT s.id,s.name,s.code,s.credits,s.semester_id,sem.number AS semester_number,c.name AS course,d.name AS department FROM subjects s LEFT JOIN semesters sem ON sem.id=s.semester_id LEFT JOIN courses c ON c.id=sem.course_id LEFT JOIN departments d ON d.id=c.department_id ORDER BY d.name,c.name,sem.number,s.name`);res.json(r.rows);}catch(err){next(err);}}
async function createSubject(req,res,next){try{const {semesterId,name,code,credits}=req.body;if(!semesterId||!name||!code)return res.status(400).json({error:'Semester, subject name and code are required.'});const r=await pool.query('INSERT INTO subjects(semester_id,name,code,credits) VALUES($1,$2,$3,$4) RETURNING *',[semesterId,String(name).trim(),String(code).trim().toUpperCase(),credits||3]);res.status(201).json(r.rows[0]);}catch(err){if(err.code==='23505')return res.status(409).json({error:'Subject code already exists for this semester.'});next(err);}}
async function updateSubject(req,res,next){try{const r=await pool.query('UPDATE subjects SET semester_id=$1,name=$2,code=$3,credits=$4 WHERE id=$5 RETURNING *',[req.body.semesterId,String(req.body.name||'').trim(),String(req.body.code||'').trim().toUpperCase(),req.body.credits||3,Number(req.params.id)]);if(!r.rows.length)return res.status(404).json({error:'Subject not found.'});res.json(r.rows[0]);}catch(err){if(err.code==='23505')return res.status(409).json({error:'Subject code already exists.'});next(err);}}
async function deleteSubject(req,res,next){try{const id=Number(req.params.id);const refs=await pool.query(`SELECT EXISTS(SELECT 1 FROM marks WHERE subject_id=$1) OR EXISTS(SELECT 1 FROM attendance WHERE subject_id=$1) OR EXISTS(SELECT 1 FROM assignments WHERE subject_id=$1) OR EXISTS(SELECT 1 FROM materials WHERE subject_id=$1) OR EXISTS(SELECT 1 FROM question_banks WHERE subject_id=$1) AS used`,[id]);if(refs.rows[0]?.used)return res.status(409).json({error:'Subject is in use and cannot be deleted.'});const r=await pool.query('DELETE FROM subjects WHERE id=$1 RETURNING id',[id]);if(!r.rows.length)return res.status(404).json({error:'Subject not found.'});res.json({message:'Subject deleted.'});}catch(err){next(err);}}

module.exports={getOverview,listPeople,createPerson,updatePerson,deactivatePerson,listDepartments,createDepartment,updateDepartment,deleteDepartment,listCourses,createCourse,updateCourse,deleteCourse,listAcademicYears,createAcademicYear,updateAcademicYear,deleteAcademicYear,listSemesters,createSemester,updateSemester,deleteSemester,listDivisions,createDivision,updateDivision,deleteDivision,listSubjects,createSubject,updateSubject,deleteSubject};