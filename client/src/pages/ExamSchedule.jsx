import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

export default function ExamSchedule() {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try { setItems((await api.getExamSchedule()).items || []); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const rows = useMemo(() => items.filter(x =>
    `${x.subject_name} ${x.subject_code} ${x.exam_type}`.toLowerCase().includes(query.toLowerCase())
  ), [items, query]);

  return <div className="page-shell">
    <div className="page-heading">
      <div><span className="dashboard-kicker">Academics</span><h1>Exam Schedule</h1><p>Official examination schedule published by the administrator.</p></div>
    </div>
    {error && <div className="error-text">{error}</div>}
    <section className="panel">
      <input className="search-input" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search subject or exam type..." />
      {loading ? <div className="tool-empty">Loading exam schedule…</div> :
        rows.length ? <div className="leave-table-wrap"><table className="modern-table"><thead><tr><th>Subject</th><th>Exam</th><th>Date</th><th>Time</th><th>Room</th><th>Instructions</th></tr></thead><tbody>
          {rows.map(x=><tr key={x.id}><td><strong>{x.subject_name}</strong><br/><span>{x.subject_code}</span></td><td>{x.exam_type}</td><td>{new Date(`${x.exam_date}T00:00:00`).toLocaleDateString()}</td><td>{x.start_time?.slice(0,5)}{x.end_time ? ` – ${x.end_time.slice(0,5)}` : ''}</td><td>{x.room || '—'}</td><td>{x.instructions || '—'}</td></tr>)}
        </tbody></table></div> : <div className="tool-empty">No examinations have been published yet.</div>}
    </section>
  </div>;
}
