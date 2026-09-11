import { useState } from 'react';
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
    { to: '/student/electives', label: 'Subject Selection' },
    { to: '/announcements', label: 'Announcements' },
    { to: '/ai', label: 'AI Assistant' },
  ],
  faculty: [
    { to: '/faculty', label: 'Dashboard' },
    { to: '/faculty/students', label: 'Student Details' },
    { to: '/faculty/marks', label: 'Enter Marks' },
    { to: '/faculty/marksheets', label: 'Upload Marksheet' },
    { to: '/faculty/attendance', label: 'Attendance' },
    { to: '/faculty/materials', label: 'Study Materials' },
    { to: '/faculty/assignments', label: 'Assignments' },
    { to: '/faculty/subject-requests', label: 'Subject Requests' },
    { to: '/faculty/announcements', label: 'Announcements' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/overview', label: 'College Overview' },
    { to: '/admin/announcements', label: 'Announcements' },
  ],
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV_BY_ROLE[user.role] || [];

  function handleLogout() {
    logout();
    navigate('/login');
    setMenuOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('');

  return (
    <div className="app-shell">
      {menuOpen && <button className="menu-overlay" aria-label="Close menu" onClick={closeMenu} />}

      <aside className={`sidebar${menuOpen ? ' menu-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="brand">EduNex</div>
        <div className="brand-tag">Academic Ledger</div>

        <div className="sidebar-menu-title">Menu</div>
        <ul className="nav-list">
          {items.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={closeMenu}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              className="menu-button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <span className="menu-icon" aria-hidden="true"><span /><span /><span /></span>
              <span>{menuOpen ? 'Close' : 'Menu'}</span>
            </button>
            <div className="topbar-title">
              {user.role === 'student' && 'Student Portal'}
              {user.role === 'faculty' && 'Faculty Portal'}
              {user.role === 'admin' && 'Administrator Portal'}
            </div>
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
