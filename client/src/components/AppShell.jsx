import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
student: [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/profile', label: 'Profile' },
  { to: '/attendance', label: 'Attendance' },
  { to: '/marksheet', label: 'Marksheet & Marks' },
  { to: '/assignments', label: 'Assignments' },
  { to: '/materials', label: 'Study Materials' },
  { to: '/achievements', label: 'Achievements' },
  { to: '/ai', label: 'AI Assistant' },
],
  faculty: [{ to: '/faculty', label: 'Class Overview' }],
  admin: [{ to: '/admin', label: 'College Overview' }],
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = NAV_BY_ROLE[user.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">EduNex</div>
        <div className="brand-tag">Academic Ledger</div>
        <ul className="nav-list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink to={item.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <button className="nav-item" style={{ padding: '8px 0', color: 'rgba(246,243,236,0.6)' }} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            {user.role === 'student' && 'Student Portal'}
            {user.role === 'faculty' && 'Faculty Portal'}
            {user.role === 'admin' && 'Administrator Portal'}
          </div>
          <div className="user-chip">
            <span>{user.fullName}</span>
            <div className="user-avatar">{initials}</div>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
