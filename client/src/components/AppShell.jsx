import { useEffect, useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
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

const FEATURE_GROUPS = {
  student: [
    { title: 'Overview', items: ['Dashboard', 'Analytics', 'Profile', 'Notifications'] },
    { title: 'Academics', items: ['Campus Planner', 'Attendance', 'Marks & Marksheet', 'Assignments', 'Assignment Results', 'Study Materials', 'Question Banks', 'Subject Selection'] },
    { title: 'Growth & AI', items: ['Achievements', 'Announcements', 'AI Academic Insights', 'AI Assistant'] },
  ],
  faculty: [
    { title: 'Overview', items: ['Dashboard', 'Analytics', 'Student Details', 'Notifications'] },
    { title: 'Teaching', items: ['Campus Planner', 'Enter Marks', 'Upload Marksheet', 'Attendance', 'Study Materials', 'Assignments', 'Question Banks'] },
    { title: 'Tools', items: ['RAG Indexing', 'Subject Requests', 'Announcements'] },
  ],
  admin: [
    { title: 'Overview', items: ['Dashboard', 'Analytics', 'College Overview', 'Notifications'] },
    { title: 'Management', items: ['Timetable Manager', 'Administration', 'Announcements'] },
  ],
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const items = NAV_BY_ROLE[user.role] || [];
  const groups = FEATURE_GROUPS[user.role] || [];
  const initials = user.fullName.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const portal = user.role === 'student' ? 'Student Portal' : user.role === 'faculty' ? 'Faculty Portal' : 'Admin Portal';
  const itemByLabel = useMemo(() => Object.fromEntries(items.map((item) => [item.label, item])), [items]);
  const activeItem = items.find((item) => location.pathname === item.to || (item.to !== '/dashboard' && location.pathname.startsWith(`${item.to}/`)));

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setFeaturesOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const goToFeature = (label) => {
    const item = itemByLabel[label];
    if (!item) return;
    navigate(item.to);
    setFeaturesOpen(false);
    setOpen(false);
  };

  const signOut = () => {
    logout();
    navigate('/login');
    setOpen(false);
    setFeaturesOpen(false);
  };

  return (
    <div className="app-shell">
      {open && <button className="sidebar-overlay" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}

      {featuresOpen && (
        <>
          <button className="feature-menu-backdrop" type="button" aria-label="Close feature menu" onClick={() => setFeaturesOpen(false)} />
          <section className="feature-menu" role="dialog" aria-modal="true" aria-label="All EduNex features">
            <div className="feature-menu-glow feature-menu-glow-one" />
            <div className="feature-menu-glow feature-menu-glow-two" />
            <div className="feature-menu-header">
              <div className="feature-menu-title-wrap">
                <span className="feature-kicker">{portal} • Workspace</span>
                <h2>All Features</h2>
                <p>Everything you need, organized in one clean menu.</p>
              </div>
              <button className="feature-close" type="button" onClick={() => setFeaturesOpen(false)} aria-label="Close feature menu">×</button>
            </div>
            <div className="feature-menu-search-hint"><span>⌕</span><span>Choose a feature to continue</span><kbd>ESC</kbd></div>
            <div className="feature-menu-scroll">
              {groups.map((group) => (
                <div className="feature-group" key={group.title}>
                  <div className="feature-group-title"><span>{group.title}</span><i /></div>
                  <div className="feature-grid">
                    {group.items.map((label) => {
                      const item = itemByLabel[label];
                      if (!item) return null;
                      return (
                        <button className="feature-card" type="button" key={item.to} onClick={() => goToFeature(label)}>
                          <span className="feature-card-icon">{item.icon}</span>
                          <span className="feature-card-copy"><strong>{item.label}</strong><small>Open feature</small></span>
                          <span className="feature-card-arrow">↗</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="feature-menu-footer"><span className="feature-status" /><span>{items.length} features available</span><span className="feature-hint">Select any card to open it</span></div>
          </section>
        </>
      )}

      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark"><span>E</span><i /></div>
          <div className="brand-copy"><div className="brand">EduNex</div><div className="brand-tag">Learn • Manage • Grow</div></div>
        </div>

        <div className="sidebar-portal"><span className="portal-dot" /><span>{portal}</span><span className="portal-role">{user.role}</span></div>

        <button className={`all-features-button ${featuresOpen ? 'is-open' : ''}`} type="button" onClick={() => setFeaturesOpen((value) => !value)} aria-expanded={featuresOpen}>
          <span className="all-features-icon">✦</span>
          <span className="all-features-copy"><strong>All Features</strong><small>Explore your workspace</small></span>
          <b>{featuresOpen ? '×' : '⌘'}</b>
        </button>

        <div className="quick-access-heading"><span>Quick access</span><span>{activeItem?.label || 'Dashboard'}</span></div>
        <div className="quick-access">
          <NavLink to={items[0]?.to || '/dashboard'} onClick={() => setOpen(false)} className={({ isActive }) => `nav-item quick-nav-item${isActive ? ' active' : ''}`}>
            <span className="nav-icon">{items[0]?.icon || '⌂'}</span>
            <span className="nav-label">{items[0]?.label || 'Dashboard'}</span>
            <span className="nav-arrow">›</span>
          </NavLink>
          {activeItem && activeItem.to !== items[0]?.to && (
            <NavLink to={activeItem.to} onClick={() => setOpen(false)} className="nav-item quick-nav-item active">
              <span className="nav-icon">{activeItem.icon}</span>
              <span className="nav-label">{activeItem.label}</span>
              <span className="nav-arrow">●</span>
            </NavLink>
          )}
        </div>

        <div className="sidebar-clean-space" />
        <div className="sidebar-footer">
          <div className="sidebar-mini-card"><span className="status-dot" /><div><strong>All systems ready</strong><span>EduNex is online</span></div></div>
          <button className="signout-button" onClick={signOut}><span className="signout-icon">↪</span><span>Sign out</span></button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="menu-button" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open navigation menu"><span className="menu-lines"><i /><i /><i /></span></button>
            <div className="topbar-heading"><div className="topbar-eyebrow">{portal}</div><div className="topbar-title">Good to see you, {user.fullName.split(' ')[0]} <span>👋</span></div></div>
          </div>
          <div className="topbar-actions">
            <button className="top-menu-button" type="button" onClick={() => setFeaturesOpen((value) => !value)} aria-expanded={featuresOpen}><span className="top-menu-icon">☷</span><span>Menu</span><small>{items.length}</small></button>
            <button className="icon-button theme-toggle" type="button" onClick={toggleTheme} aria-label="Toggle theme" title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}><span>{isDark ? '☀' : '☾'}</span><small>{isDark ? 'Light' : 'Dark'}</small></button>
            <NavLink className="notification-button" to="/notifications" aria-label="Notifications"><span>◔</span><i /></NavLink>
            <div className="user-chip"><div className="user-avatar">{initials}</div><div className="user-meta"><strong>{user.fullName}</strong><span>{user.role}</span></div><span className="user-chevron">⌄</span></div>
          </div>
        </header>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}
