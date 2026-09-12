const pool=require('../config/db');

function gradePoint(p){if(p>=90)return 10;if(p>=80)return 9;if(p>=70)return 8;if(p>=60)return 7;if(p>=50)return 6;if(p>=45)return 5;if(p>=40)return 4;return 0;}

async function getAcademicInsights(req,res,next){
  try{
    const student=(await pool.query('SELECT id FROM students WHERE user_id=$1',[req.user.id])).rows[0];
    if(!student)return res.status(404).json({error:'Student profile not found'});

    const [attendance,marks,assignments]=await Promise.all([
      pool.query(`SELECT s.name AS subject,s.code,COUNT(a.id)::int AS total,COUNT(a.id) FILTER(WHERE a.status='present')::int AS present FROM student_subjects ss JOIN subjects s ON s.id=ss.subject_id LEFT JOIN attendance a ON a.student_id=ss.student_id AND a.subject_id=ss.subject_id WHERE ss.student_id=$1 AND ss.status='approved' GROUP BY s.id,s.name,s.code ORDER BY s.name`,[student.id]),
      pool.query(`SELECT s.name AS subject,s.code,s.credits,m.exam_type,m.obtained_marks,m.max_marks FROM marks m JOIN subjects s ON s.id=m.subject_id WHERE m.student_id=$1 AND m.published=true ORDER BY s.name,m.created_at DESC`,[student.id]),
      pool.query(`SELECT COUNT(*) FILTER(WHERE COALESCE(sub.status,'not_submitted')='submitted')::int AS submitted,COUNT(*) FILTER(WHERE COALESCE(sub.status,'not_submitted')='pending')::int AS pending,COUNT(*) FILTER(WHERE sub.id IS NULL)::int AS not_submitted,COUNT(*)::int AS total FROM assignments a JOIN subjects s ON s.id=a.subject_id JOIN student_subjects ss ON ss.subject_id=a.subject_id AND ss.student_id=$1 AND ss.status='approved' LEFT JOIN assignment_submissions sub ON sub.assignment_id=a.id AND sub.student_id=$1`,[student.id])
    ]);

    const attendanceRows=attendance.rows.map(r=>({...r,percentage:r.total?Number(((r.present/r.total)*100).toFixed(2)):0}));
    const totalClasses=attendanceRows.reduce((a,r)=>a+r.total,0),totalPresent=attendanceRows.reduce((a,r)=>a+r.present,0);
    const overallAttendance=totalClasses?Number(((totalPresent/totalClasses)*100).toFixed(2)):0;

    const latestBySubject=new Map();
    for(const m of marks.rows){if(!latestBySubject.has(m.code))latestBySubject.set(m.code,m);}
    const performance=Array.from(latestBySubject.values()).map(m=>{const pct=Number(m.max_marks)>0?(Number(m.obtained_marks)/Number(m.max_marks))*100:0;return {...m,percentage:Number(pct.toFixed(2)),gradePoint:gradePoint(pct)}});
    const weighted=performance.reduce((a,m)=>a+Number(m.gradePoint)*Number(m.credits||0),0),credits=performance.reduce((a,m)=>a+Number(m.credits||0),0);
    const currentGpa=credits?Number((weighted/credits).toFixed(2)):0;
    const strengths=performance.filter(x=>x.percentage>=80).sort((a,b)=>b.percentage-a.percentage).slice(0,5);
    const risks=performance.filter(x=>x.percentage<60).sort((a,b)=>a.percentage-b.percentage).slice(0,5);
    const attendanceRisks=attendanceRows.filter(x=>x.percentage<75).sort((a,b)=>a.percentage-b.percentage);
    const a=assignments.rows[0]||{total:0,submitted:0,pending:0,not_submitted:0};
    const actions=[];
    if(overallAttendance<75)actions.push('Raise overall attendance above 75% and prioritize the subjects currently below 75%.');
    attendanceRisks.slice(0,3).forEach(x=>actions.push(`Improve attendance in ${x.subject} (${x.percentage}%).`));
    risks.slice(0,3).forEach(x=>actions.push(`Review ${x.subject} (${x.percentage}% in the latest published result).`));
    if(Number(a.pending)+Number(a.not_submitted)>0)actions.push(`Complete ${Number(a.pending)+Number(a.not_submitted)} outstanding assignment(s).`);
    if(!actions.length)actions.push('Keep your attendance and academic performance at the current level and continue regular revision.');

    res.json({overallAttendance,currentGpa,performance,attendanceBySubject:attendanceRows,assignmentSummary:a,strengths,risks:risks.concat(attendanceRisks.map(x=>({subject:x.subject,code:x.code,percentage:x.percentage,type:'attendance'}))),actions,generatedAt:new Date().toISOString(),mode:'dashboard_analytics'});
  }catch(err){next(err)}
}
module.exports={getAcademicInsights};
