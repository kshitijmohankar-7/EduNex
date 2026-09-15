import { useEffect, useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../services/api';
import { attendanceProjection } from '../utils/attendancePrediction';

function status(pct) { return pct >= 85 ? 'Excellent' : pct >= 75 ? 'On track' : 'Needs attention'; }

export default function Attendance() {
  const [attendance, setAttendance] = useState([]); const [overall, setOverall] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { api.getAttendance().then(data => { setAttendance(data.bySubject || []); setOverall(Number(data.overallPercentage || 0)); }).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const chartData = useMemo(() => attendance.map(a => ({ code: a.code, percentage: Number(a.percentage || 0) })), [attendance]);
  if (loading) return <div className="page-shell"><div className="panel">Loading attendance...</div></div>;
  if (error) return <div className="page-shell"><div className="panel"><div className="error-text">{error}</div></div></div>;
  const overallRecord = attendance.reduce((x, a) => ({ presentCount: x.presentCount + Number(a.presentCount || 0), totalCount: x.totalCount + Number(a.totalCount || 0) }), { presentCount: 0, totalCount: 0 });
  const projection = attendanceProjection(overallRecord.presentCount, overallRecord.totalCount);
  return <div className="page-shell"><div className="page-heading"><div><span className="dashboard-kicker">Academic health</span><h1>Attendance</h1><p>Track subject attendance and understand exactly how much consistency you need.</p></div><div className={`score-badge ${overall >= 75 ? 'positive' : 'negative'}`}><strong>{overall}%</strong><span>{status(overall)}</span></div></div>
    <div className="card-grid attendance-kpis"><section className="panel"><span className="dashboard-kicker">Overall</span><strong className="metric-value">{overall}%</strong><span>Current attendance</span></section><section className="panel"><span className="dashboard-kicker">Target</span><strong className="metric-value">75%</strong><span>Minimum recommended</span></section><section className="panel"><span className="dashboard-kicker">Projection</span><strong className="metric-value">{projection.needed}</strong><span>{projection.needed ? 'classes needed' : 'classes needed'}</span></section></div>
    <section className="panel"><div className="panel-heading"><div><span className="dashboard-kicker">Prediction</span><h2>How to reach 75%</h2></div><span className="badge">Attendance planner</span></div><p>{projection.message}</p>{overall < 75 && <div className="notice warning">Avoid additional absences while you recover your attendance percentage.</div>}{overall >= 75 && <div className="notice success">You are currently meeting the 75% target. Keep attending consistently.</div>}</section>
    <section className="panel"><div className="panel-heading"><div><span className="dashboard-kicker">Subject overview</span><h2>Attendance by subject</h2></div></div><ResponsiveContainer width="100%" height={280}><BarChart data={chartData} margin={{ left: -10 }}><CartesianGrid stroke="rgba(28,27,24,0.08)" vertical={false}/><XAxis dataKey="code" tick={{fontSize:11}}/><YAxis domain={[0,100]}/><Tooltip/><Bar dataKey="percentage" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></section>
    <section className="panel"><div className="table-scroll"><table className="modern-table"><thead><tr><th>Subject</th><th>Code</th><th>Present</th><th>Total</th><th>Attendance</th><th>Status</th><th>75% plan</th></tr></thead><tbody>{attendance.length ? attendance.map(a => { const p = attendanceProjection(a.presentCount, a.totalCount); return <tr key={a.code}><td>{a.subject}</td><td>{a.code}</td><td>{a.presentCount}</td><td>{a.totalCount}</td><td><strong>{a.percentage}%</strong></td><td><span className={`badge ${a.percentage >= 75 ? 'success' : 'warning'}`}>{status(a.percentage)}</span></td><td>{p.needed ? `+${p.needed} classes` : 'Target met'}</td></tr>; }) : <tr><td colSpan="7">No attendance records available.</td></tr>}</tbody></table></div></section>
  </div>;
}
