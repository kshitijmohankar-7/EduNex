import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function QuestionBanks() {
  const { user } = useAuth();
  const [banks, setBanks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [form, setForm] = useState({ subjectId: '', unit: '', title: '', file: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setLoading(true); setError('');
      const bankData = await api.getQuestionBanks();
      setBanks(Array.isArray(bankData) ? bankData : []);
      if (user?.role === 'faculty') {
        const subjectData = await api.getSubjects();
        setSubjects(Array.isArray(subjectData) ? subjectData : []);
      }
    } catch (e) { setError(e.message || 'Unable to load question banks.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [user?.role]);

  async function upload(e) {
    e.preventDefault(); setMessage(''); setError('');
    if (!form.file) return setError('Please select a PDF, DOC or DOCX file.');
    setSaving(true);
    try {
      const data = new FormData();
      data.append('subjectId', form.subjectId); data.append('unit', form.unit); data.append('title', form.title); data.append('file', form.file);
      await api.createQuestionBank(data);
      setMessage('Question bank uploaded successfully.'); setForm({ subjectId:'', unit:'', title:'', file:null }); e.target.reset(); await load();
    } catch (e) { setError(e.message || 'Upload failed.'); }
    finally { setSaving(false); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this question bank?')) return;
    try { await api.deleteQuestionBank(id); setMessage('Question bank deleted.'); await load(); }
    catch (e) { setError(e.message || 'Unable to delete question bank.'); }
  }

  if (loading) return <div className="panel">Loading question banks...</div>;
  return <div>
    <div className="ledger-heading"><div><h2>Question Banks</h2><p style={{margin:'6px 0 0',color:'var(--muted-text)'}}>{user?.role === 'faculty' ? 'Upload question papers for subjects assigned to you.' : 'Practice material for subjects in your current semester.'}</p></div><span className="count">{banks.length}</span></div>
    <hr className="ledger-rule" />
    {(message || error) && <div className="panel"><div className={error ? 'error-text' : ''}>{error || message}</div></div>}

    {user?.role === 'faculty' && <div className="panel"><h2>Upload question bank</h2><form onSubmit={upload} style={{display:'grid',gap:12}}><div className="card-grid"><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700}}>Subject<select className="input" value={form.subjectId} onChange={(e)=>setForm({...form,subjectId:e.target.value})} required><option value="">Select subject</option>{subjects.map((s)=><option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select></label><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700}}>Unit<Input value={form.unit} onChange={(e)=>setForm({...form,unit:e.target.value})} placeholder="Unit 1" /></label><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700}}>Title<Input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} required /></label><label style={{display:'grid',gap:6,fontSize:12,fontWeight:700}}>File<input className="input" type="file" accept=".pdf,.doc,.docx" onChange={(e)=>setForm({...form,file:e.target.files?.[0] || null})} required /></label></div><button className="btn" disabled={saving}>{saving ? 'Uploading...' : 'Upload question bank'}</button></form></div>}

    <div className="panel"><div className="table-wrapper"><table className="ledger-table"><thead><tr><th>Subject</th><th>Unit</th><th>Title</th><th>Uploaded</th><th>File</th>{user?.role==='faculty'&&<th>Action</th>}</tr></thead><tbody>{banks.length===0?<tr><td colSpan={user?.role==='faculty'?6:5}>No question banks available.</td></tr>:banks.map((b)=><tr key={b.id}><td>{b.subject} <span className="code-stamp">{b.code}</span></td><td>{b.unit || '-'}</td><td><strong>{b.title}</strong></td><td>{b.uploaded_at ? new Date(b.uploaded_at).toLocaleDateString('en-IN') : '-'}</td><td><a className="btn btn-outline" href={api.getFileUrl(b.file_path)} target="_blank" rel="noreferrer">Open</a></td>{user?.role==='faculty'&&<td><button className="btn btn-outline" onClick={()=>remove(b.id)}>Delete</button></td>}</tr>)}</tbody></table></div></div>
  </div>;
}

function Input(props) { return <input className="input" {...props} />; }
