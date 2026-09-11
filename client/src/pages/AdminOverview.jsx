import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { api.getAdminOverview().then(setStats).catch((e) => setError(e.message || 'Unable to load overview.')); }, []);

  return <div>
    <div className="ledger-heading"><div><h2>College Overview</h2><p style={{margin:'6px 0 0',color:'var(--muted-text)'}}>Live college statistics and administrative controls.</p></div><button className="btn" onClick={()=>navigate('/admin/manage')}>Open Administration</button></div>
    <hr className="ledger-rule" />
    {error && <div className="panel"><div className="error-text">{error}</div></div>}
    <div className="card-grid">
      {[
        ['Departments', stats?.departments], ['Courses', stats?.courses], ['Active Faculty', stats?.active_faculty],
        ['Active Students', stats?.active_students], ['Subjects', stats?.subjects], ['Assignments', stats?.assignments],
      ].map(([label,value])=><div className="stat-card" key={label}><div className="stat-label">{label}</div><div className="stat-value">{value ?? '—'}</div></div>)}
    </div>
    <div className="panel"><div className="ledger-heading"><div><h2>Administrator controls</h2><p style={{margin:'6px 0 0',color:'var(--muted-text)'}}>Create student/faculty accounts, reset passwords, activate or deactivate accounts, and manage the academic structure.</p></div></div><button className="btn" onClick={()=>navigate('/admin/manage')}>Manage students, faculty & academic structure</button></div>
  </div>;
}
