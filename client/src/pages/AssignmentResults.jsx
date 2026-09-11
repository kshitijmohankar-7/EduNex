import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function AssignmentResults(){
 const[rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{api.getStudentAssignmentGrades().then(d=>setRows(Array.isArray(d)?d:[])).catch(e=>setError(e.message||'Unable to load assignment results')).finally(()=>setLoading(false))},[]);
 if(loading)return <div className="panel">Loading assignment results...</div>;
 return <div><div className="ledger-heading"><div><h2>Assignment Results</h2><p style={{margin:'6px 0 0',color:'var(--muted-text)'}}>See submission status, marks and faculty feedback.</p></div><span className="count">{rows.length}</span></div><hr className="ledger-rule"/>{error&&<div className="panel"><div className="error-text">{error}</div></div>}<div className="panel">{!rows.length?<p>No assignment results available yet.</p>:<div className="table-wrapper"><table className="ledger-table"><thead><tr><th>Subject</th><th>Assignment</th><th>Status</th><th>Marks</th><th>Feedback</th><th>Submitted</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td><span className="code-stamp">{r.code}</span><div style={{marginTop:5}}>{r.subject}</div></td><td><strong>{r.title}</strong></td><td><span className={r.status==='rejected'?'pill pill-bad':r.status==='pending'?'pill pill-warn':'pill pill-good'}>{r.status}</span></td><td>{r.marks_obtained===null||r.marks_obtained===undefined?'Not graded':`${r.marks_obtained}/100`}</td><td>{r.feedback||'—'}</td><td>{r.submitted_at?new Date(r.submitted_at).toLocaleString('en-IN'):'—'}</td></tr>)}</tbody></table></div>}</div></div>;
}
