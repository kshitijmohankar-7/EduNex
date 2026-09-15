import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const NAV_BY_ROLE = {
  student: [
    { to: '/dashboard', label: 'Dashboard', icon: '⌂' }, { to: '/planner', label: 'Campus Planner', icon: '▦' },
    { to: '/analytics', label: 'Analytics', icon: '◒' }, { to: '/notifications', label: 'Notifications', icon: '◔' },
    { to: '/profile', label: 'Profile', icon: '○' }, { to: '/attendance', label: 'Attendance', icon: '✓' },
    { to: '/marksheet', label: 'Marks & Marksheet', icon: '▤' }, { to: '/assignments', label: 'Assignments', icon: '□' },
    { to: '/assignment-results', label: 'Assignment Results', icon: '↗' }, { to: '/materials', label: 'Study Materials', icon: '▱' },
    { to: '/question-banks', label: 'Question Banks', icon: '?' }, { to: '/achievements', label: 'Achievements', icon: '✦' },
    { to: '/student/electives', label: 'Subject Selection', icon: '◇' }, { to: '/announcements', label: 'Announcements', icon: '!' },
    { to: '/academic-insights', label: 'AI Academic Insights', icon: '✧' }, { to: '/ai', label: 'AI Assistant', icon: '✦' },
  ],
  faculty: [
    { to: '/faculty', label: 'Dashboard', icon: '⌂' }, { to: '/planner', label: 'Campus Planner', icon: '▦' },
    { to: '/faculty/analytics', label: 'Analytics', icon: '◒' }, { to: '/notifications', label: 'Notifications', icon: '◔' },
    { to: '/faculty/students', label: 'Student Details', icon: '○' }, { to: '/faculty/marks', label: 'Enter Marks', icon: '▤' },
    { to: '/faculty/marksheets', label: 'Upload Marksheet', icon: '↥' }, { to: '/faculty/attendance', label: 'Attendance', icon: '✓' },
    { to: '/faculty/materials', label: 'Study Materials', icon: '▱' }, { to: '/faculty/rag', label: 'RAG Indexing', icon: '✧' },
    { to: '/faculty/assignments', label: 'Assignments', icon: '□' }, { to: '/question-banks', label: 'Question Banks', icon: '?' },
    { to: '/faculty/subject-requests', label: 'Subject Requests', icon: '◇' }, { to: '/faculty/announcements', label: 'Announcements', icon: '!' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: '⌂' }, { to: '/planner', label: 'Timetable Manager', icon: '▦' },
    { to: '/admin/analytics', label: 'Analytics', icon: '◒' }, { to: '/notifications', label: 'Notifications', icon: '◔' },
    { to: '/admin/overview', label: 'College Overview', icon: '▤' }, { to: '/admin/manage', label: 'Administration', icon: '⚙' },
    { to: '/admin/announcements', label: 'Announcements', icon: '!' },
  ],
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const items = NAV_BY_ROLE[user.role] || [];
  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const portal = user.role === 'student' ? 'Student Portal' : user.role === 'faculty' ? 'Faculty Portal' : 'Admin Portal';

  return (
    <div className="app-shell">
      {open && <button className="sidebar-overlay" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">E</div>
          <div><div className="brand">EduNex</div><div className="brand-tag">Learn • Manage • Grow</div></div>
        </div>
        <div className="nav-section-label">Workspace</div>
        <nav><ul className="nav-list">{items.map((item) => <li key={item.to}><NavLink to={item.to} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}><span className="nav-icon">{item.icon}</span><span>{item.label}</span></NavLink></li>)}</ul></nav>
        <div className="sidebar-footer">
          <div className="sidebar-mini-card"><span className="status-dot" /> <span>EduNex is online</span></div>
          <button className="signout-button" onClick={() => { logout(); navigate('/login'); setOpen(false); }}>↪ <span>Sign out</span></button>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="menu-button" type="button" onClick={() => setOpen(!open)} aria-expanded={open}><span className="menu-lines"><i /><i /><i /></span></button><div><div className="topbar-eyebrow">{portal}</div><div className="topbar-title">Good to see you, {user.fullName.split(' ')[0]} 👋</div></div></div>
          <div className="topbar-actions">
            <button className="icon-button" type="button" onClick={toggleTheme} aria-label="Toggle theme" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>{isDark ? '☀' : '☾'}</button>
            <NavLink className="notification-button" to="/notifications" aria-label="Notifications">◔</NavLink>
            <div className="user-chip"><div className="user-avatar">{initials}</div><div className="user-meta"><strong>{user.fullName}</strong><span>{user.role}</span></div></div>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
