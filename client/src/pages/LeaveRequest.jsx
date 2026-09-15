import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const emptyForm = { facultyId: '', startDate: '', endDate: '', reason: '' };

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const a = new Date(`${start}T00:00:00`); const b = new Date(`${end}T00:00:00`);
  return b >= a ? Math.floor((b - a) / 86400000) + 1 : 0;
}

export default function LeaveRequest() {
  const [faculty, setFaculty] = useState([]); const [requests, setRequests] = useState([]);
  const [form, setForm] = useState(emptyForm); const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const duration = useMemo(() => daysBetween(form.startDate, form.endDate), [form.startDate, form.endDate]);

  const load = async () => {
    setLoading(true); setError('');
    try { const [people, mine] = await Promise.all([api.getLeaveFacultyOptions(), api.getStudentLeaveRequests()]); setFaculty(people); setRequests(mine); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try { await api.createLeaveRequest(form); setForm(emptyForm); setSuccess('Leave request sent successfully. Your faculty will review it.'); await load(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  return <div className="page-stack leave-page">
    <section className="page-hero leave-hero"><div><span className="eyebrow">Student Services</span><h1>Leave Request</h1><p>Apply for leave and send the request directly to your faculty.</p></div><div className="leave-hero-icon">✈</div></section>
    {error && <div className="alert-card danger">⚠ <span>{error}</span></div>}{success && <div className="alert-card success">✓ <span>{success}</span></div>}
    <div className="leave-layout">
      <section className="panel leave-form-panel">
        <div className="section-heading"><div><span className="eyebrow">New application</span><h2>Apply for leave</h2></div><span className="status-pill pending">Pending review</span></div>
        <form onSubmit={submit} className="leave-form">
          <label>Send request to<select required value={form.facultyId} onChange={e=>setForm({...form,facultyId:e.target.value})}><option value="">Select faculty</option>{faculty.map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
          <div className="form-grid-two"><label>From date<input type="date" required value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></label><label>To date<input type="date" required min={form.startDate||undefined} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></label></div>
          <div className="duration-preview"><span>📅</span><div><strong>{duration ? `${duration} day${duration>1?'s':''}` : 'Select your dates'}</strong><small>Leave duration</small></div></div>
          <label>Reason<textarea required minLength={5} maxLength={1000} rows={5} placeholder="Explain why you need leave..." value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label>
          <button className="primary-button leave-submit" disabled={saving}>{saving ? 'Sending request…' : 'Send Leave Request →'}</button>
        </form>
      </section>
      <aside className="panel leave-info"><div className="info-icon">✓</div><h3>How it works</h3><div className="steps"><div><b>1</b><span><strong>Submit</strong><small>Choose dates, faculty and reason.</small></span></div><div><b>2</b><span><strong>Faculty review</strong><small>Your faculty can approve or reject it.</small></span></div><div><b>3</b><span><strong>Track status</strong><small>See the decision and faculty note here.</small></span></div></div></aside>
    </div>
    <section className="panel leave-history"><div className="section-heading"><div><span className="eyebrow">History</span><h2>My leave requests</h2></div><span className="history-count">{requests.length} request{requests.length===1?'':'s'}</span></div>
      {loading ? <div className="empty-state">Loading your requests…</div> : requests.length===0 ? <div className="empty-state">You have not submitted a leave request yet.</div> : <div className="leave-table-wrap"><table className="modern-table"><thead><tr><th>Duration</th><th>Faculty</th><th>Reason</th><th>Status</th><th>Faculty note</th></tr></thead><tbody>{requests.map(r=><tr key={r.id}><td><strong>{r.start_date}</strong><br/><span>to {r.end_date}</span></td><td>{r.faculty_name}</td><td className="reason-cell">{r.reason}</td><td><span className={`status-pill ${r.status}`}>{r.status}</span></td><td>{r.faculty_note || '—'}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
