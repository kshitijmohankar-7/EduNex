import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const quickActions = [
  ['/attendance', '✓', 'Attendance', 'Check your attendance'], ['/assignments', '□', 'Assignments', 'View pending work'],
  ['/materials', '▱', 'Study Materials', 'Continue learning'], ['/ai', '✦', 'AI Assistant', 'Ask EduNex AI'],
  ['/planner', '▦', 'Campus Planner', 'See your schedule'], ['/leave', '◷', 'Leave Request', 'Apply or track leave'],
];
function Stat({ label, value, note, tone = '' }) { return <div className={`stat-card dashboard-stat ${tone}`}><div className="stat-label">{label}</div><div className="stat-value">{value}</div><div className="stat-sub">{note}</div></div>; }

export default function StudentDashboard() {
  const navigate = useNavigate(); const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { let alive = true; (async () => { try {
    const results = await Promise.allSettled([api.getProfile(), api.getAttendance(), api.getAcademicMetrics(), api.getAssignments(), api.getAchievements(), api.getAnnouncements(), api.getStudentLeaveRequests()]);
    if (!alive) return; const value = (r, f = null) => r.status === 'fulfilled' ? r.value : f;
    setData({ profile: value(results[0], {}), attendance: value(results[1], {}), metrics: value(results[2], {}), assignments: value(results[3], []), achievements: value(results[4], []), announcements: value(results[5], []), leaves: value(results[6], []) });
  } catch (err) { if (alive) setError(err.message || 'Unable to load dashboard'); } finally { if (alive) setLoading(false); } })(); return () => { alive = false; }; }, []);
  const assignmentList = useMemo(() => Array.isArray(data?.assignments) ? data.assignments : data?.assignments?.assignments || [], [data]);
  const achievementList = useMemo(() => Array.isArray(data?.achievements) ? data.achievements : data?.achievements?.achievements || [], [data]);
  const announcementList = useMemo(() => Array.isArray(data?.announcements) ? data.announcements : data?.announcements?.announcements || [], [data]);
  const leaveList = useMemo(() => Array.isArray(data?.leaves) ? data.leaves : data?.leaves?.requests || [], [data]);
  if (loading) return <div className="dashboard-page"><div className="dashboard-skeleton-grid">{Array.from({ length: 6 }).map((_, i) => <div className="panel skeleton-card" key={i} />)}</div></div>;
  if (error) return <div className="panel"><div className="error-text">{error}</div><button className="btn" onClick={() => window.location.reload()}>Retry</button></div>;
  if (!data) return <div className="panel">No dashboard data available.</div>;
  const { profile = {}, attendance = {}, metrics = {} } = data; const firstName = profile.full_name?.split(' ')[0] || 'Student';
  const overall = Number(attendance.overallPercentage ?? attendance.overall_percentage ?? 0); const cgpa = metrics.cgpa ?? metrics.CGPA ?? metrics.currentCgpa ?? '—'; const credits = metrics.credits ?? metrics.totalCredits ?? '—';
  const pending = assignmentList.filter(x => !['submitted','graded','completed'].includes(String(x.status || '').toLowerCase())).length; const latestLeave = leaveList[0];
  return <div className="dashboard-page">
    <section className="dashboard-hero"><div><span className="dashboard-kicker">Student workspace · {profile.academic_year || 'Academic year'}</span><h1>Welcome back, {firstName} <span>👋</span></h1><p>{profile.course || 'B.Tech'} · {profile.department || 'Computer Science'} · Semester {profile.semester || '—'} · Division {profile.division || '—'}</p></div><div className="dashboard-date"><span>Today</span><strong>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</strong></div></section>
    <div className="card-grid dashboard-stats"><Stat label="Attendance" value={`${overall}%`} note={overall >= 75 ? 'On track for 75%+' : 'Needs attention'} tone={overall >= 75 ? 'stat-success' : 'stat-warning'} /><Stat label="CGPA" value={cgpa} note="Current academic performance" /><Stat label="Assignments" value={pending} note="Pending / active tasks" tone={pending ? 'stat-warning' : 'stat-success'} /><Stat label="Credits" value={credits} note="Academic credits" /></div>
    <section className="dashboard-section-head"><div><h2>Quick actions</h2><p>Jump directly to the things you use most.</p></div></section>
    <div className="quick-action-grid">{quickActions.map(([to,icon,title,text]) => <button className="quick-action" key={to} onClick={() => navigate(to)}><span className="quick-action-icon">{icon}</span><span><strong>{title}</strong><small>{text}</small></span><b>↗</b></button>)}</div>
    <div className="dashboard-columns">
      <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Assignment focus</h2><p>Your next academic tasks.</p></div><button className="btn btn-outline" onClick={() => navigate('/assignments')}>View all</button></div>{assignmentList.slice(0,4).map((item,i) => <div className="dashboard-list-row" key={item.id || i}><span className="list-icon">□</span><div><strong>{item.title || item.name || 'Assignment'}</strong><small>{item.due_date || item.dueDate ? `Due ${item.due_date || item.dueDate}` : item.subject_name || 'Academic task'}</small></div><span className="pill pill-warn">{item.status || 'Pending'}</span></div>)}{!assignmentList.length && <div className="dashboard-empty">No active assignments right now.</div>}</section>
      <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Announcements</h2><p>Latest college updates.</p></div><button className="btn btn-outline" onClick={() => navigate('/announcements')}>View all</button></div>{announcementList.slice(0,4).map((item,i) => <div className="dashboard-list-row" key={item.id || i}><span className="list-icon">!</span><div><strong>{item.title || 'Announcement'}</strong><small>{item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : 'Latest update'}</small></div></div>)}{!announcementList.length && <div className="dashboard-empty">No announcements available.</div>}</section>
    </div>
    <div className="dashboard-columns"><section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Student success snapshot</h2><p>Small signals that help you stay on track.</p></div></div><div className="success-grid"><div><span>Attendance</span><strong>{overall >= 75 ? 'Healthy' : 'At risk'}</strong></div><div><span>Achievements</span><strong>{achievementList.length}</strong></div><div><span>Leave status</span><strong>{latestLeave?.status || 'No active request'}</strong></div></div><button className="ai-banner" onClick={() => navigate('/ai')}><span>✦</span><div><strong>Ask EduNex AI</strong><small>Get help with study planning, attendance, marks or assignments.</small></div><b>→</b></button></section><section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Profile</h2><p>Your academic identity.</p></div><button className="btn btn-outline" onClick={() => navigate('/profile')}>Open</button></div><div className="profile-mini"><div className="profile-mini-avatar">{firstName.slice(0,1).toUpperCase()}</div><div><strong>{profile.full_name || 'Student'}</strong><span>{profile.student_code || 'Student ID'} · {profile.email || 'Email unavailable'}</span></div></div><div className="profile-facts"><span><small>Department</small>{profile.department || '—'}</span><span><small>Semester</small>{profile.semester || '—'}</span><span><small>Division</small>{profile.division || '—'}</span></div></section></div>
  </div>;
}
