import Announcements from '../components/Announcements';

export default function AdminOverview() {
  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>College Overview</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            View the college-level summary and administrative management options.
          </p>
        </div>
      </div>
      <hr className="ledger-rule" />

      <div className="card-grid">
        <div className="stat-card"><div className="stat-label">Departments</div><div className="stat-value">6</div></div>
        <div className="stat-card"><div className="stat-label">Faculty</div><div className="stat-value">84</div></div>
        <div className="stat-card"><div className="stat-label">Students</div><div className="stat-value">2,140</div></div>
        <div className="stat-card"><div className="stat-label">Active courses</div><div className="stat-value">12</div></div>
      </div>

      <Announcements />

      <div className="panel">
        <div className="ledger-heading"><h2>System Management</h2></div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn">Manage departments</button>
          <button className="btn btn-outline">Manage courses</button>
          <button className="btn btn-outline">Manage faculty</button>
          <button className="btn btn-outline">Manage students</button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 14 }}>
          Administrative management tools can be connected to their respective API modules as they are implemented.
        </p>
      </div>
    </div>
  );
}
