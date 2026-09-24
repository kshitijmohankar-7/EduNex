import { useEffect, useState } from 'react';
import { api } from '../services/api';

const empty = { subjectId:'', examType:'END SEMESTER', examDate:'', startTime:'', endTime:'', room:'', instructions:'' };

export default function AdminExamSchedule() {
  const [subjects,setSubjects]=useState([]);
  const [items,setItems]=useState([]);
  const [form,setForm]=useState(empty);
  const [editing,setEditing]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  async function load(){
    setLoading(true); setError('');
    try{
      const [subjectData,scheduleData]=await Promise.all([api.getAdminSubjects(),api.getExamSchedule()]);
      setSubjects(subjectData||[]); setItems(scheduleData.items||[]);
    }catch(e){setError(e.message)}finally{setLoading(false)}
  }
  useEffect(()=>{load()},[]);

  function edit(item){
    setEditing(item.id);
    setForm({subjectId:String(item.subject_id),examType:item.exam_type||'END SEMESTER',examDate:item.exam_date||'',startTime:item.start_time?.slice(0,5)||'',endTime:item.end_time?.slice(0,5)||'',room:item.room||'',instructions:item.instructions||''});
    setSuccess('');
  }
  function reset(){setEditing(null);setForm(empty);}

  async function submit(e){
    e.preventDefault();setSaving(true);setError('');setSuccess('');
    try{
      if(editing) await api.updateExamSchedule(editing,form); else await api.createExamSchedule(form);
      setSuccess(editing?'Exam schedule updated.':'Exam schedule published.');
      reset(); await load();
    }catch(e){setError(e.message)}finally{setSaving(false)}
  }
  async function remove(id){
    if(!window.confirm('Delete this exam schedule entry?'))return;
    try{await api.deleteExamSchedule(id);await load();setSuccess('Exam schedule entry deleted.')}catch(e){setError(e.message)}
  }

  return <div className="page-shell">
    <div className="page-heading"><div><span className="dashboard-kicker">Administration</span><h1>Exam Schedule Manager</h1><p>Only administrators can create or change the official exam schedule.</p></div></div>
    {error&&<div className="error-text">{error}</div>}{success&&<div className="success-text">{success}</div>}
    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">{editing?'Edit examination':'Publish examination'}</span><h2>{editing?'Update schedule entry':'Add exam'}</h2></div>{editing&&<button className="btn" type="button" onClick={reset}>Cancel</button>}</div>
      <form onSubmit={submit}>
        <label>Subject<select required value={form.subjectId} onChange={e=>setForm({...form,subjectId:e.target.value})}><option value="">Select subject</option>{subjects.map(s=><option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></label>
        <div className="form-grid-two">
          <label>Exam type<input required value={form.examType} onChange={e=>setForm({...form,examType:e.target.value})} placeholder="END SEMESTER"/></label>
          <label>Exam date<input required type="date" value={form.examDate} onChange={e=>setForm({...form,examDate:e.target.value})}/></label>
          <label>Start time<input required type="time" value={form.startTime} onChange={e=>setForm({...form,startTime:e.target.value})}/></label>
          <label>End time<input type="time" value={form.endTime} onChange={e=>setForm({...form,endTime:e.target.value})}/></label>
          <label>Room / Hall<input value={form.room} onChange={e=>setForm({...form,room:e.target.value})} placeholder="Room 204"/></label>
          <label>Instructions<input value={form.instructions} onChange={e=>setForm({...form,instructions:e.target.value})} placeholder="Bring college ID"/></label>
        </div>
        <button className="btn" disabled={saving}>{saving?'Saving…':editing?'Update Schedule':'Publish Exam'}</button>
      </form>
    </section>
    <section className="panel"><div className="section-heading"><div><span className="eyebrow">Published</span><h2>Official schedule</h2></div></div>
      {loading?<div className="tool-empty">Loading…</div>:items.length?<div className="leave-table-wrap"><table className="modern-table"><thead><tr><th>Subject</th><th>Exam</th><th>Date</th><th>Time</th><th>Room</th><th>Actions</th></tr></thead><tbody>{items.map(x=><tr key={x.id}><td><strong>{x.subject_name}</strong><br/><span>{x.subject_code}</span></td><td>{x.exam_type}</td><td>{x.exam_date}</td><td>{x.start_time?.slice(0,5)}{x.end_time?` – ${x.end_time.slice(0,5)}`:''}</td><td>{x.room||'—'}</td><td><button className="btn" type="button" onClick={()=>edit(x)}>Edit</button> <button className="btn" type="button" onClick={()=>remove(x.id)}>Delete</button></td></tr>)}</tbody></table></div>:<div className="tool-empty">No exam schedule entries yet.</div>}
    </section>
  </div>;
}
