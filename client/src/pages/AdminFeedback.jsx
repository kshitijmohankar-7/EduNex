import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function AdminFeedback() {
  const [items,setItems]=useState([]);
  const [error,setError]=useState('');
  useEffect(()=>{api.getFeedback().then(r=>setItems(r.items||[])).catch(e=>setError(e.message))},[]);
  return <div className="page-shell">
    <div className="page-heading"><div><span className="dashboard-kicker">Administration</span><h1>Campus Feedback</h1><p>Review feedback submitted by students and faculty.</p></div></div>
    {error&&<div className="error-text">{error}</div>}
    <section className="panel"><h2>Submitted feedback</h2>{items.length?<div className="leave-table-wrap"><table className="modern-table"><thead><tr><th>User</th><th>Rating</th><th>Comment</th><th>Date</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><strong>{x.full_name}</strong><br/><span>{x.email}</span></td><td>{'★'.repeat(x.rating)} ({x.rating}/5)</td><td>{x.message||'—'}</td><td>{new Date(x.created_at).toLocaleString()}</td></tr>)}</tbody></table></div>:<div className="tool-empty">No feedback has been submitted yet.</div>}</section>
  </div>;
}
