import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Welcome, {user?.fullName || 'Administrator'}</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            Use the Menu button to open College Overview and Announcements.
          </p>
        </div>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">
        <div className="ledger-heading"><h2>Administrator Details</h2></div>
        <table className="ledger-table">
          <tbody>
            <tr><td><strong>Name</strong></td><td>{user?.fullName || '-'}</td></tr>
            <tr><td><strong>Email</strong></td><td>{user?.email || '-'}</td></tr>
            <tr><td><strong>Role</strong></td><td>Administrator</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
