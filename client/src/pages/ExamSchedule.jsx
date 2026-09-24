import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

export default function ExamSchedule() {
  const [items,setItems]=useState([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  async function load(){setLoading(true);setError('');try{setItems((await api.getExamSchedule()).items||[])}catch(e){setError(e.message)}finally{setLoading(false)}}
  useEffect(()=>{load()},[]);
  const rows=useMemo(()=>items.filter(x=>(String(x.subject_name)+' '+String(x.subject_code)+' '+String(x.exam_type)).toLowerCase().includes(query.toLowerCase())),[items,query]);
  return <div className="page-stack campus-page">
    <section className="page-hero campus-hero exam-hero"><div><span className="eyebrow">Academics</span><h1>Exam Schedule</h1><p>Your official examination timetable, published by the administrator.</p></div><div className="campus-hero-icon">▤</div></section>
    {error&&<div className="alert-card danger">⚠ <span>{error}</span></div>}
    <section className="panel campus-panel">
      <div className="section-heading campus-heading"><div><span className="eyebrow">Published timetable</span><h2>Upcoming examinations</h2></div><span className="history-count">{rows.length} exam{rows.length===1?'':'s'}</span></div>
      <div className="campus-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search subject, code or exam type..." /></div>
      {loading?<div className="campus-empty"><div className="empty-icon">◷</div><strong>Loading schedule</strong><span>Please wait while we fetch the latest timetable.</span></div>:
       rows.length?<div className="exam-list">{rows.map(x=><article className="exam-card" key={x.id}><div className="exam-date"><strong>{new Date(x.exam_date+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit'})}</strong><span>{new Date(x.exam_date+'T00:00:00').toLocaleDateString('en-IN',{month:'short'})}</span></div><div className="exam-main"><div className="exam-title-row"><div><span className="exam-code">{x.subject_code}</span><h3>{x.subject_name}</h3></div><span className="exam-type">{x.exam_type}</span></div><div className="exam-meta"><span>◷ {x.start_time?.slice(0,5)}{x.end_time?' – '+x.end_time.slice(0,5):''}</span>{x.instructions&&<span>ⓘ {x.instructions}</span>}</div></div></article>)}</div>:
       <div className="campus-empty"><div className="empty-icon">▤</div><strong>No examinations published</strong><span>The administrator has not published an examination schedule yet.</span></div>}
    </section>
  </div>;
}
