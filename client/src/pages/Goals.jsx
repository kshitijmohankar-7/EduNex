import { useMemo, useState } from 'react';

const seed = [
  { id: 1, title: 'Reach 80% attendance', category: 'Academic', progress: 72, target: '80%', due: 'This semester' },
  { id: 2, title: 'Complete Java arrays', category: 'Learning', progress: 60, target: '100%', due: '30 Sep' },
  { id: 3, title: 'Build portfolio project', category: 'Career', progress: 35, target: '100%', due: '15 Oct' },
];

export default function Goals() {
  const [goals, setGoals] = useState(seed);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Academic');
  const [filter, setFilter] = useState('All');
  const visible = useMemo(() => filter === 'All' ? goals : goals.filter(g => g.category === filter), [goals, filter]);
  const add = (e) => { e.preventDefault(); if (!title.trim()) return; setGoals([{ id: Date.now(), title: title.trim(), category, progress: 0, target: '100%', due: 'No deadline' }, ...goals]); setTitle(''); };
  const bump = id => setGoals(goals.map(g => g.id === id ? { ...g, progress: Math.min(100, g.progress + 10) } : g));
  return <div className="page-shell"><div className="page-heading"><div><span className="dashboard-kicker">Student success</span><h1>Goals</h1><p>Turn your academic and career plans into measurable progress.</p></div></div>
    <div className="card-grid">
      <div className="panel"><h2>Create a goal</h2><form className="form-grid" onSubmit={add}><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Score 8.5 SGPA" /><select className="input" value={category} onChange={e => setCategory(e.target.value)}><option>Academic</option><option>Learning</option><option>Career</option><option>Personal</option></select><button className="btn" type="submit">Add goal</button></form></div>
    </div>
    <div className="toolbar"><div className="tabs">{['All','Academic','Learning','Career','Personal'].map(x => <button className={`tab ${filter === x ? 'active' : ''}`} key={x} onClick={() => setFilter(x)}>{x}</button>)}</div></div>
    <div className="card-grid">{visible.map(g => <article className="panel goal-card" key={g.id}><div className="panel-heading"><div><span className="badge">{g.category}</span><h2>{g.title}</h2></div><strong>{g.progress}%</strong></div><div className="progress-track"><span style={{ width: `${g.progress}%` }} /></div><div className="goal-meta"><span>Target: {g.target}</span><span>Due: {g.due}</span></div><button className="btn btn-outline" onClick={() => bump(g.id)} disabled={g.progress >= 100}>{g.progress >= 100 ? 'Completed' : 'Mark +10%'}</button></article>)}</div>
  </div>;
}
