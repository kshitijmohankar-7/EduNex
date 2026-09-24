import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Feedback() {
  const [rating,setRating]=useState(0);
  const [message,setMessage]=useState('');
  const [items,setItems]=useState([]);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  async function load(){
    try{setItems((await api.getFeedback()).items||[])}catch(e){setError(e.message)}
  }
  useEffect(()=>{load()},[]);

  async function submit(e){
    e.preventDefault();setError('');setSuccess('');
    if(!rating){setError('Please select a rating.');return}
    setSending(true);
    try{await api.submitFeedback({rating,message});setRating(0);setMessage('');setSuccess('Thank you. Your feedback has been submitted.');await load()}catch(e){setError(e.message)}finally{setSending(false)}
  }

  return <div className="page-shell">
    <div className="page-heading"><div><span className="dashboard-kicker">Feedback</span><h1>Campus Feedback</h1><p>Your feedback is saved securely and can be reviewed by the EduNex administration.</p></div></div>
    {error&&<div className="error-text">{error}</div>}{success&&<div className="success-text">{success}</div>}
    <section className="panel"><form onSubmit={submit}><h2>Rate your experience</h2><div className="feature-grid">{[1,2,3,4,5].map(n=><button type="button" className={`feature-card ${rating===n?'active':''}`} key={n} onClick={()=>setRating(n)}><strong>{'★'.repeat(n)}</strong><small>{n}/5</small></button>)}</div><label>Comments<textarea rows={5} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what worked well or what should improve..."/></label><button className="btn" disabled={sending}>{sending?'Submitting…':'Submit feedback'}</button></form></section>
    <section className="panel"><h2>My previous feedback</h2>{items.length?items.map(x=><article className="academic-subject-card" key={x.id}><strong>{'★'.repeat(x.rating)} <small>{x.rating}/5</small></strong><span>{x.message||'No comment'}</span><small>{new Date(x.created_at).toLocaleString()}</small></article>):<div className="tool-empty">No feedback submitted yet.</div>}</section>
  </div>;
}
