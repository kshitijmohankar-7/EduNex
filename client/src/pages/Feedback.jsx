import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Feedback(){
  const [rating,setRating]=useState(0),[message,setMessage]=useState(''),[items,setItems]=useState([]);
  const [sending,setSending]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState('');
  async function load(){try{setItems((await api.getFeedback()).items||[])}catch(e){setError(e.message)}}
  useEffect(()=>{load()},[]);
  async function submit(e){e.preventDefault();setError('');setSuccess('');if(!rating){setError('Please select a rating before submitting.');return}setSending(true);try{await api.submitFeedback({rating,message});setRating(0);setMessage('');setSuccess('Your feedback has been submitted successfully.');await load()}catch(e){setError(e.message)}finally{setSending(false)}}
  return <div className="page-stack campus-page">
    <section className="page-hero campus-hero feedback-hero"><div><span className="eyebrow">Student Voice</span><h1>Campus Feedback</h1><p>Share your experience and help us improve EduNex.</p></div><div className="campus-hero-icon">★</div></section>
    {error&&<div className="alert-card danger">⚠ <span>{error}</span></div>}{success&&<div className="alert-card success">✓ <span>{success}</span></div>}
    <div className="feedback-layout">
      <section className="panel campus-panel feedback-form-panel"><div className="section-heading campus-heading"><div><span className="eyebrow">Your experience</span><h2>Rate EduNex</h2></div></div>
        <form onSubmit={submit} className="feedback-form">
          <div className="rating-grid">{[1,2,3,4,5].map(n=><button type="button" key={n} className={'rating-option '+(rating===n?'selected':'')} onClick={()=>setRating(n)}><span>★</span><strong>{n}</strong><small>{n===1?'Needs work':n===5?'Excellent':'Select'}</small></button>)}</div>
          <label>Comments<span>Optional — up to 2000 characters</span><textarea rows={6} maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what worked well or what should improve..." /></label>
          <div className="form-footer"><small>{message.length}/2000</small><button className="primary-button" disabled={sending}>{sending?'Submitting…':'Submit feedback →'}</button></div>
        </form>
      </section>
      <aside className="panel campus-side-panel"><div className="side-icon">✓</div><h3>Your voice matters</h3><p>Feedback is stored securely and can be reviewed by EduNex administration.</p><div className="side-stat"><strong>{items.length}</strong><span>feedback submission{items.length===1?'':'s'}</span></div></aside>
    </div>
    <section className="panel campus-panel"><div className="section-heading campus-heading"><div><span className="eyebrow">History</span><h2>My previous feedback</h2></div></div>
      {items.length?<div className="feedback-history">{items.map(x=><article className="feedback-card" key={x.id}><div className="feedback-rating">{'★'.repeat(x.rating)}<span>{x.rating}/5</span></div><p>{x.message||'No comment provided.'}</p><time>{new Date(x.created_at).toLocaleString()}</time></article>)}</div>:<div className="campus-empty"><div className="empty-icon">★</div><strong>No feedback yet</strong><span>Your submitted feedback will appear here.</span></div>}
    </section>
  </div>;
}
