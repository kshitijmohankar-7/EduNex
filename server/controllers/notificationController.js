const pool=require('../config/db');
async function syncNotifications(userId){
  const user=(await pool.query(`SELECT u.id,u.role,s.id AS student_id,s.department_id AS student_department_id,f.id AS faculty_id,f.department_id AS faculty_department_id FROM users u LEFT JOIN students s ON s.user_id=u.id LEFT JOIN faculty f ON f.user_id=u.id WHERE u.id=$1`,[userId])).rows[0];
  if(!user)return;
  const rows=[];
  const departmentId=user.role==='student'?user.student_department_id:user.role==='faculty'?user.faculty_department_id:null;
  const announcementsQuery=departmentId===null
    ? `SELECT a.id,a.title,a.body,a.created_at FROM announcements a ORDER BY a.created_at DESC LIMIT 30`
    : `SELECT a.id,a.title,a.body,a.created_at FROM announcements a WHERE a.department_id IS NULL OR a.department_id=$1 ORDER BY a.created_at DESC LIMIT 30`;
  const announcements=await pool.query(announcementsQuery,departmentId===null?[]:[departmentId]);
  for(const a of announcements.rows)rows.push({type:'announcement',title:a.title,message:a.body||'New EduNex announcement.',link:user.role==='student'?'/announcements':user.role==='faculty'?'/faculty/announcements':'/admin/announcements',sourceType:'announcement',sourceId:a.id,createdAt:a.created_at});
  if(user.role==='student'){
    const assignments=await pool.query(`SELECT a.id,a.title,s.name AS subject,a.deadline,a.issue_date FROM assignments a JOIN subjects s ON s.id=a.subject_id JOIN student_subjects ss ON ss.subject_id=a.subject_id AND ss.student_id=$1 AND ss.status='approved' ORDER BY a.issue_date DESC LIMIT 30`,[user.student_id]);
    for(const a of assignments.rows)rows.push({type:'assignment',title:`New assignment: ${a.title}`,message:`${a.subject} assignment is available. Deadline: ${a.deadline||'not specified'}.`,link:'/assignments',sourceType:'assignment',sourceId:a.id,createdAt:a.issue_date});
  }
  if(user.role==='faculty'){
    const submissions=await pool.query(`SELECT ass.id,ass.assignment_id,ass.submitted_at,a.title,u.full_name AS student_name FROM assignment_submissions ass JOIN assignments a ON a.id=ass.assignment_id JOIN students st ON st.id=ass.student_id JOIN users u ON u.id=st.user_id WHERE a.uploaded_by=$1 ORDER BY ass.submitted_at DESC LIMIT 30`,[user.faculty_id]);
    for(const s of submissions.rows)rows.push({type:'submission',title:`Assignment submitted: ${s.title}`,message:`${s.student_name||'A student'} submitted an assignment for your review.`,link:`/faculty/assignments/${s.assignment_id}/submissions`,sourceType:'submission',sourceId:s.id,createdAt:s.submitted_at});
  }
  for(const n of rows){await pool.query(`INSERT INTO notifications(user_id,type,title,message,link,source_type,source_id,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,[userId,n.type,n.title,n.message,n.link,n.sourceType,n.sourceId,n.createdAt||new Date()])}
}
async function listNotifications(req,res,next){try{await syncNotifications(req.user.id);const result=await pool.query(`SELECT id,type,title,message,link,read_at,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,[req.user.id]);const unread=await pool.query(`SELECT COUNT(*)::int AS count FROM notifications WHERE user_id=$1 AND read_at IS NULL`,[req.user.id]);res.json({items:result.rows,unreadCount:unread.rows[0].count})}catch(err){next(err)}}
async function markRead(req,res,next){try{const id=Number(req.params.id);const r=await pool.query(`UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND user_id=$2 RETURNING id`,[id,req.user.id]);if(!r.rows.length)return res.status(404).json({error:'Notification not found'});res.json({message:'Notification marked as read'})}catch(err){next(err)}}
async function markAllRead(req,res,next){try{await pool.query(`UPDATE notifications SET read_at=COALESCE(read_at,NOW()) WHERE user_id=$1 AND read_at IS NULL`,[req.user.id]);res.json({message:'All notifications marked as read'})}catch(err){next(err)}}
module.exports={listNotifications,markRead,markAllRead};
