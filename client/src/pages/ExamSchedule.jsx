import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
function dateLabel(value){if(!value)return '-';const raw=String(value);const datePart=raw.includes('T')?raw.slice(0,10):raw.slice(0,10);const d=new Date(`${datePart}T00:00:00`);return Number.isNaN(d.getTime())?datePart:d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});}
function timeLabel(value){if(!value)return '';const raw=String(value);const match=raw.match(/(\d{1,2}):(\d{2})/);if(!match)return raw;const d=new Date(1970,0,1,Number(match[1]),Number(match[2]));return d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true});}

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
       rows.length?<div className="exam-list">{rows.map(x=><article className="exam-card" key={x.id}><div className="exam-date"><strong>{dateLabel(x.exam_date).split(' ')[0]}</strong><span>{dateLabel(x.exam_date).split(' ').slice(1).join(' ')}</span></div><div className="exam-main"><div className="exam-title-row"><div><span className="exam-code">{x.subject_code}</span><h3>{x.subject_name}</h3></div><span className="exam-type">{x.exam_type}</span></div><div className="exam-meta"><span>◷ {timeLabel(x.start_time)}{x.end_time?' – '+timeLabel(x.end_time):''}</span>{x.instructions&&<span>ⓘ {x.instructions}</span>}</div></div></article>)}</div>:
       <div className="campus-empty"><div className="empty-icon">▤</div><strong>No examinations published</strong><span>The administrator has not published an examination schedule yet.</span></div>}
    </section>
  </div>;
}
