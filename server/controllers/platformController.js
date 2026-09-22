const crypto=require('crypto');
const bcrypt=require('bcryptjs');
const pool=require('../config/db');

const hashToken=(token)=>crypto.createHash('sha256').update(token).digest('hex');

async function requestPasswordReset(req,res,next){
  try{
    const email=String(req.body?.email||'').trim().toLowerCase();
    if(!email)return res.status(400).json({error:'email is required'});
    const user=(await pool.query('SELECT id FROM users WHERE LOWER(email)=LOWER($1) AND is_active=TRUE',[email])).rows[0];
    if(user){
      const token=crypto.randomBytes(32).toString('hex');
      await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1 OR expires_at<NOW()',[user.id]);
      await pool.query('INSERT INTO password_reset_tokens(user_id,token_hash,expires_at) VALUES($1,$2,NOW()+INTERVAL \'30 minutes\')',[user.id,hashToken(token)]);
      const resetBaseUrl=String(process.env.PASSWORD_RESET_URL||process.env.CLIENT_URL||'http://localhost:5173').replace(/\/$/,'');
      const resetUrl=resetBaseUrl+'/reset-password?token='+encodeURIComponent(token);
      const apiKey=String(process.env.RESEND_API_KEY||'').trim();
      const from=String(process.env.MAIL_FROM||'EduNex <onboarding@resend.dev>').trim();
      if(apiKey){
        try{
          const mailResponse=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({from,to:[email],subject:'EduNex password reset',html:'<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Reset your EduNex password</h2><p>We received a request to reset your EduNex password.</p><p><a href="'+resetUrl+'" style="display:inline-block;padding:12px 18px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">Reset Password</a></p><p>This link expires in 30 minutes.</p><p>If you did not request this, you can ignore this email.</p></div>'})});
          if(!mailResponse.ok){
            let detail='';
            try{detail=await mailResponse.text()}catch{}
            throw new Error('Resend returned HTTP '+mailResponse.status+(detail?' - '+detail.slice(0,1000):''));
          }
        }catch(mailError){
          console.error('[EduNex] Password reset email failed:',mailError.message);
          if(process.env.NODE_ENV!=='production') console.log('[EduNex] Password reset link:',resetUrl);
        }
      }else if(process.env.NODE_ENV!=='production'){
        console.log('[EduNex] Password reset link:',resetUrl);
      }
    }
    res.json({message:'If an active account exists for that email, a password reset link has been created.'});
  }catch(e){next(e)}
}

async function resetPassword(req,res,next){
  try{
    const token=String(req.body?.token||'').trim();
    const password=String(req.body?.password||'');
    if(!token||password.length<8)return res.status(400).json({error:'token and a password of at least 8 characters are required'});
    const r=await pool.query('SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW()',[hashToken(token)]);
    if(!r.rows.length)return res.status(400).json({error:'Invalid or expired reset token'});
    const hash=await bcrypt.hash(password,12);
    await pool.query('UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2',[hash,r.rows[0].user_id]);
    await pool.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1',[r.rows[0].id]);
    res.json({message:'Password updated successfully. Please sign in again.'});
  }catch(e){next(e)}
}

async function listAiSessions(req,res,next){
  try{const r=await pool.query('SELECT id,title,created_at,updated_at FROM ai_chat_sessions WHERE user_id=$1 ORDER BY updated_at DESC LIMIT 50',[req.user.id]);res.json({items:r.rows})}catch(e){next(e)}
}
async function createAiSession(req,res,next){
  try{const title=String(req.body?.title||'New AI conversation').trim().slice(0,200);const r=await pool.query('INSERT INTO ai_chat_sessions(user_id,title) VALUES($1,$2) RETURNING id,title,created_at,updated_at',[req.user.id,title||'New AI conversation']);res.status(201).json(r.rows[0])}catch(e){next(e)}
}
async function getAiSession(req,res,next){
  try{const r=await pool.query('SELECT s.id,s.title,s.created_at,s.updated_at,m.id message_id,m.role,m.content,m.created_at message_created_at FROM ai_chat_sessions s LEFT JOIN ai_chat_messages m ON m.session_id=s.id WHERE s.id=$1 AND s.user_id=$2 ORDER BY m.id',[req.params.id,req.user.id]);if(!r.rows.length)return res.status(404).json({error:'AI session not found'});const first=r.rows[0];res.json({id:first.id,title:first.title,created_at:first.created_at,updated_at:first.updated_at,messages:r.rows.filter(x=>x.message_id).map(x=>({id:x.message_id,role:x.role,content:x.content,created_at:x.message_created_at}))})}catch(e){next(e)}
}
async function saveAiMessages(req,res,next){
  try{
    const session=await pool.query('SELECT id FROM ai_chat_sessions WHERE id=$1 AND user_id=$2',[req.params.id,req.user.id]);
    if(!session.rows.length)return res.status(404).json({error:'AI session not found'});
    const messages=Array.isArray(req.body?.messages)?req.body.messages.slice(-20):[];
    for(const m of messages){if(['user','assistant'].includes(m?.role)&&String(m.content||'').trim())await pool.query('INSERT INTO ai_chat_messages(session_id,role,content) VALUES($1,$2,$3)',[req.params.id,m.role,String(m.content).slice(0,12000)])}
    await pool.query('UPDATE ai_chat_sessions SET updated_at=NOW(),title=COALESCE(NULLIF($2,\'\'),title) WHERE id=$1',[req.params.id,String(req.body?.title||'').slice(0,200)]);
    res.status(201).json({message:'AI messages saved'});
  }catch(e){next(e)}
}
async function listMessages(req,res,next){
  try{const r=await pool.query(`SELECT m.id,m.sender_user_id,m.recipient_user_id,m.subject,m.body,m.read_at,m.created_at,s.full_name sender_name,r.full_name recipient_name FROM student_faculty_messages m JOIN users s ON s.id=m.sender_user_id JOIN users r ON r.id=m.recipient_user_id WHERE m.sender_user_id=$1 OR m.recipient_user_id=$1 ORDER BY m.created_at DESC LIMIT 200`,[req.user.id]);res.json({items:r.rows})}catch(e){next(e)}
}
async function sendMessage(req,res,next){
  try{const recipient=Number(req.body?.recipientUserId);const body=String(req.body?.body||'').trim();const subject=String(req.body?.subject||'').trim().slice(0,200);if(!Number.isInteger(recipient)||!body)return res.status(400).json({error:'recipientUserId and body are required'});if(recipient===req.user.id)return res.status(400).json({error:'You cannot message yourself'});const target=(await pool.query('SELECT id,role,is_active FROM users WHERE id=$1',[recipient])).rows[0];if(!target?.is_active||!['student','faculty'].includes(target.role)||!['student','faculty'].includes(req.user.role))return res.status(400).json({error:'Only student and faculty accounts can communicate'});const r=await pool.query('INSERT INTO student_faculty_messages(sender_user_id,recipient_user_id,subject,body) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,recipient,subject||null,body]);res.status(201).json(r.rows[0])}catch(e){next(e)}
}
async function markMessageRead(req,res,next){try{const r=await pool.query('UPDATE student_faculty_messages SET read_at=COALESCE(read_at,NOW()) WHERE id=$1 AND recipient_user_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rows.length)return res.status(404).json({error:'Message not found'});res.json({message:'Message marked as read'})}catch(e){next(e)}}
async function listTickets(req,res,next){try{const r=await pool.query('SELECT t.*,u.full_name assigned_name FROM help_desk_tickets t LEFT JOIN users u ON u.id=t.assigned_to WHERE t.user_id=$1 OR $2=\'admin\' ORDER BY t.created_at DESC',[req.user.id,req.user.role]);res.json({items:r.rows})}catch(e){next(e)}}
async function createTicket(req,res,next){try{const subject=String(req.body?.subject||'').trim();const description=String(req.body?.description||'').trim();if(!subject||!description)return res.status(400).json({error:'subject and description are required'});const r=await pool.query('INSERT INTO help_desk_tickets(user_id,subject,description,priority) VALUES($1,$2,$3,$4) RETURNING *',[req.user.id,subject,description,['low','normal','high','urgent'].includes(req.body?.priority)?req.body.priority:'normal']);res.status(201).json(r.rows[0])}catch(e){next(e)}}
async function updateTicket(req,res,next){try{if(req.user.role!=='admin')return res.status(403).json({error:'Admin access required'});const fields=[];const values=[];for(const key of ['status','priority','resolution'])if(req.body?.[key]!==undefined){fields.push(`${key}=$${values.length+1}`);values.push(String(req.body[key]))}if(!fields.length)return res.status(400).json({error:'No changes provided'});values.push(req.params.id);const r=await pool.query(`UPDATE help_desk_tickets SET ${fields.join(',')},updated_at=NOW() WHERE id=$${values.length} RETURNING *`,values);if(!r.rows.length)return res.status(404).json({error:'Ticket not found'});res.json(r.rows[0])}catch(e){next(e)}}
async function preferences(req,res,next){try{if(req.method==='GET'){const r=await pool.query('SELECT announcements,assignments,grades,attendance,messages FROM user_notification_preferences WHERE user_id=$1',[req.user.id]);return res.json(r.rows[0]||{announcements:true,assignments:true,grades:true,attendance:true,messages:true})}const allowed=['announcements','assignments','grades','attendance','messages'];const values=allowed.map(k=>req.body?.[k]===false?false:true);const r=await pool.query(`INSERT INTO user_notification_preferences(user_id,announcements,assignments,grades,attendance,messages) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(user_id) DO UPDATE SET announcements=EXCLUDED.announcements,assignments=EXCLUDED.assignments,grades=EXCLUDED.grades,attendance=EXCLUDED.attendance,messages=EXCLUDED.messages,updated_at=NOW() RETURNING *`,[req.user.id,...values]);res.json(r.rows[0])}catch(e){next(e)}}
module.exports={requestPasswordReset,resetPassword,listAiSessions,createAiSession,getAiSession,saveAiMessages,listMessages,sendMessage,markMessageRead,listTickets,createTicket,updateTicket,preferences};
