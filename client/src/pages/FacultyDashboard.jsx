import { useAuth } from '../context/AuthContext';

export default function FacultyDashboard() {
  const { user } = useAuth();

  return (
    <section className="account-dashboard faculty-dashboard">
      <header className="account-dashboard-hero">
        <p className="account-dashboard-eyebrow">FACULTY PORTAL</p>
        <h1>Welcome, {user?.fullName || 'Faculty'}</h1>
        <p className="account-dashboard-description">
          Manage your teaching workspace, student records, attendance, marks, assignments and study materials.
        </p>
      </header>

      <section className="account-details-card" aria-labelledby="faculty-details-heading">
        <div className="account-details-heading">
          <div>
            <p className="account-details-kicker">YOUR ACCOUNT</p>
            <h2 id="faculty-details-heading">Faculty Details</h2>
          </div>
          <span className="account-role-pill">Faculty</span>
        </div>
        <div className="account-table-wrap">
          <table className="account-details-table">
            <tbody>
              <tr><th scope="row">Name</th><td>{user?.fullName || '-'}</td></tr>
              <tr><th scope="row">Email</th><td>{user?.email || '-'}</td></tr>
              <tr><th scope="row">Role</th><td>Faculty</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
