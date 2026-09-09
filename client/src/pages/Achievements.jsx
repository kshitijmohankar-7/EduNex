import { useState } from 'react';
import { mockAchievements } from '../mock/mockData';

export default function Achievements() {
  const [achievements, setAchievements] = useState(mockAchievements);
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');

  function handleAdd(e) {
    e.preventDefault();
    if (!title) return;
    setAchievements([{ title, organization, date: new Date().toISOString().slice(0, 10) }, ...achievements]);
    setTitle('');
    setOrganization('');
  }

  return (
    <div>
      <div className="ledger-heading"><h2>Achievements &amp; certifications</h2></div>
      <hr className="ledger-rule" />

      <div className="panel">
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: 2, marginBottom: 0 }}>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Hackathon winner" />
          </div>
          <div className="field" style={{ flex: 2, marginBottom: 0 }}>
            <label>Organization</label>
            <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. TechFest 2026" />
          </div>
          <button className="btn" type="submit">Add</button>
        </form>
      </div>

      <div className="panel">
        {achievements.map((a, i) => (
          <div key={i} style={{ padding: '10px 0', borderBottom: i < achievements.length - 1 ? '1px solid var(--line)' : 'none' }}>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{a.title}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-text)' }}>{a.organization} · {a.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
