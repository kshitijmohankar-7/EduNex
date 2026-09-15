import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function FacultyLeaveRequests() {
  const [requests,setRequests]=useState([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [busy,setBusy]=useState(null);
  const load=async()=>{setLoading(true);setError('');try{setRequests(await api.getFacultyLeaveRequests())}catch(e){setError(e.message)}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const review=async(id,status)=>{const note=window.prompt(`${status==='approved'?'Optional approval note':'Optional rejection reason'}:`,'');if(note===null)return;setBusy(`${id}-${status}`);try{await api.reviewLeaveRequest(id,{status,facultyNote:note});await load()}catch(e){setError(e.message)}finally{setBusy(null)}};
  const pending=requests.filter(r=>r.status==='pending').length;
  return <div className="page-stack leave-page faculty-leave-page">
    <section className="page-hero leave-hero faculty-leave-hero"><div><span className="eyebrow">Faculty Workspace</span><h1>Leave Requests</h1><p>Review student leave applications and approve or reject them.</p></div><div className="leave-hero-stat"><strong>{pending}</strong><span>Pending review</span></div></section>
    {error&&<div className="alert-card danger">⚠ <span>{error}</span></div>}
    <section className="panel leave-history faculty-requests-panel"><div className="section-heading"><div><span className="eyebrow">Inbox</span><h2>Student applications</h2></div><button className="secondary-button" onClick={load}>↻ Refresh</button></div>
      {loading?<div className="empty-state">Loading leave requests…</div>:requests.length===0?<div className="empty-state"><div className="empty-icon">✓</div><strong>No leave requests</strong><span>New student applications will appear here.</span></div>:<div className="faculty-leave-list">{requests.map(r=><article className={`leave-request-card ${r.status}`} key={r.id}><div className="leave-request-top"><div className="student-avatar">{r.student_name.split(' ').map(x=>x[0]).slice(0,2).join('').toUpperCase()}</div><div className="student-copy"><strong>{r.student_name}</strong><span>{r.student_code}</span></div><span className={`status-pill ${r.status}`}>{r.status}</span></div><div className="leave-request-grid"><div><small>Duration</small><strong>📅 {r.start_date} → {r.end_date}</strong></div><div className="leave-reason"><small>Reason</small><p>{r.reason}</p></div></div>{r.status==='pending'?<div className="leave-actions"><button className="approve-button" disabled={busy===`${r.id}-approved`} onClick={()=>review(r.id,'approved')}>✓ {busy===`${r.id}-approved`?'Approving…':'Approve'}</button><button className="reject-button" disabled={busy===`${r.id}-rejected`} onClick={()=>review(r.id,'rejected')}>× {busy===`${r.id}-rejected`?'Rejecting…':'Reject'}</button></div>:<div className="reviewed-note"><span>Reviewed {r.reviewed_at?new Date(r.reviewed_at).toLocaleString():''}</span>{r.faculty_note&&<strong>Note: {r.faculty_note}</strong>}</div>}</article>)}</div>}
    </section>
  </div>;
}
