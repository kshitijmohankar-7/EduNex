import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
function pct(value) { return `${num(value).toFixed(1)}%`; }

export default function AcademicPerformance() {
  const [metrics, setMetrics] = useState(null);
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { let alive = true; Promise.all([api.getAcademicMetrics(), api.getMarks()]).then(([m, rows]) => { if (!alive) return; setMetrics(m || {}); setMarks(Array.isArray(rows) ? rows : []); }).catch((e) => alive && setError(e.message || 'Unable to load academic performance')).finally(() => alive && setLoading(false)); return () => { alive = false; }; }, []);

  const subjectRows = useMemo(() => {
    const grouped = {};
    marks.forEach((m) => { const key = m.code || m.subject || m.subject_id; if (!grouped[key]) grouped[key] = { subject: m.subject || m.subject_name || 'Subject', code: m.code || '-', obtained: 0, max: 0, grade: m.grade || '-' }; grouped[key].obtained += num(m.obtained_marks); grouped[key].max += num(m.max_marks); if (m.grade) grouped[key].grade = m.grade; });
    return Object.values(grouped).map((x) => ({ ...x, percentage: x.max ? (x.obtained / x.max) * 100 : 0 }));
  }, [marks]);
  const average = subjectRows.length ? subjectRows.reduce((s, x) => s + x.percentage, 0) / subjectRows.length : 0;
  const currentCgpa = metrics?.currentCgpa ?? metrics?.cgpa ?? metrics?.CGPA ?? '—';
  const semesters = Array.isArray(metrics?.semesters) ? metrics.semesters : [];
  const credits = metrics?.totalCredits ?? metrics?.credits ?? semesters.reduce((s, x) => s + num(x.totalCredits), 0);

  if (loading) return <div className="dashboard-page"><div className="dashboard-skeleton-grid">{[1,2,3,4,5,6].map((x) => <div className="panel skeleton-card" key={x} />)}</div></div>;
  if (error) return <div className="panel"><div className="error-text">{error}</div></div>;
  return <div className="dashboard-page academic-performance-page">
    <section className="dashboard-hero"><div><span className="dashboard-kicker">Academic intelligence · Performance</span><h1>Your Academic Performance</h1><p>Track SGPA, CGPA, credits and subject-level performance in one place.</p></div><div className="dashboard-date"><span>Current CGPA</span><strong>{currentCgpa}</strong></div></section>
    <div className="card-grid dashboard-stats"><div className="stat-card dashboard-stat"><div className="stat-label">CGPA</div><div className="stat-value">{currentCgpa}</div><div className="stat-sub">Current cumulative performance</div></div><div className="stat-card dashboard-stat"><div className="stat-label">Average Marks</div><div className="stat-value">{pct(average)}</div><div className="stat-sub">Across published subjects</div></div><div className="stat-card dashboard-stat"><div className="stat-label">Credits</div><div className="stat-value">{credits || '—'}</div><div className="stat-sub">Earned / calculated credits</div></div><div className="stat-card dashboard-stat"><div className="stat-label">Subjects</div><div className="stat-value">{subjectRows.length}</div><div className="stat-sub">With published marks</div></div></div>
    <div className="dashboard-columns">
      <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Semester performance</h2><p>SGPA and CGPA progression.</p></div></div>{!semesters.length ? <div className="dashboard-empty">No semester performance data is available yet.</div> : <div className="performance-bars">{semesters.map((s) => <div className="performance-row" key={s.semesterId || s.semesterNumber}><div><strong>Sem {s.semesterNumber}</strong><small>{s.totalCredits || 0} credits</small></div><div className="performance-track"><span style={{ width: `${Math.min(100, num(s.sgpa) * 10)}%` }} /></div><b>{s.sgpa ?? '—'}</b></div>)}</div>}</section>
      <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Academic summary</h2><p>Key signals from published results.</p></div></div><div className="success-grid"><div><span>Latest SGPA</span><strong>{semesters[semesters.length - 1]?.sgpa ?? '—'}</strong></div><div><span>Best SGPA</span><strong>{semesters.length ? Math.max(...semesters.map((s) => num(s.sgpa))).toFixed(2) : '—'}</strong></div><div><span>Published exams</span><strong>{marks.length}</strong></div></div></section>
    </div>
    <section className="panel dashboard-panel"><div className="panel-heading"><div><h2>Subject performance</h2><p>Compare your published marks by subject.</p></div></div>{!subjectRows.length ? <div className="dashboard-empty">No published subject marks available.</div> : <div className="academic-subject-grid">{subjectRows.map((row) => <div className="academic-subject-card" key={row.code + row.subject}><div className="academic-subject-top"><div><strong>{row.subject}</strong><small>{row.code}</small></div><b>{pct(row.percentage)}</b></div><div className="performance-track"><span style={{ width: `${Math.min(100, row.percentage)}%` }} /></div><div className="academic-subject-bottom"><span>{row.obtained}/{row.max} marks</span><span>Grade {row.grade}</span></div></div>)}</div>}</section>
  </div>;
}
