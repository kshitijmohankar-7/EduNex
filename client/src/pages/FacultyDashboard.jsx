import { useAuth } from '../context/AuthContext';

export default function FacultyDashboard() {
  const { user } = useAuth();

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Welcome, {user?.fullName || 'Faculty'}</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            Use the Menu button to open Student Details, Attendance, Marks, Assignments,
            Study Materials, Subject Requests and Announcements.
          </p>
        </div>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">
        <div className="ledger-heading"><h2>Faculty Details</h2></div>
        <table className="ledger-table">
          <tbody>
            <tr><td><strong>Name</strong></td><td>{user?.fullName || '-'}</td></tr>
            <tr><td><strong>Email</strong></td><td>{user?.email || '-'}</td></tr>
            <tr><td><strong>Role</strong></td><td>Faculty</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
