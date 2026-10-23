import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();

  return (
    <section className="account-dashboard admin-dashboard">
      <header className="account-dashboard-hero">
        <p className="account-dashboard-eyebrow">ADMIN PORTAL</p>
        <h1>Welcome, {user?.fullName || 'Administrator'}</h1>
        <p className="account-dashboard-description">
          Manage your college workspace, campus information, announcements and administration tools.
        </p>
      </header>

      <section className="account-details-card" aria-labelledby="admin-details-heading">
        <div className="account-details-heading">
          <div>
            <p className="account-details-kicker">YOUR ACCOUNT</p>
            <h2 id="admin-details-heading">Administrator Details</h2>
          </div>
          <span className="account-role-pill">Administrator</span>
        </div>
        <div className="account-table-wrap">
          <table className="account-details-table">
            <tbody>
              <tr><th scope="row">Name</th><td>{user?.fullName || '-'}</td></tr>
              <tr><th scope="row">Email</th><td>{user?.email || '-'}</td></tr>
              <tr><th scope="row">Role</th><td>Administrator</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
