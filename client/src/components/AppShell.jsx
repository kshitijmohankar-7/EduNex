import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV_BY_ROLE = {
  student: [
    { to: '/dashboard', label: 'Dashboard' }, { to: '/profile', label: 'Profile' }, { to: '/attendance', label: 'Attendance' },
    { to: '/marksheet', label: 'Marksheet & Marks' }, { to: '/assignments', label: 'Assignments' }, { to: '/materials', label: 'Study Materials' },
    { to: '/question-banks', label: 'Question Banks' }, { to: '/achievements', label: 'Achievements' }, { to: '/student/electives', label: 'Subject Selection' },
    { to: '/announcements', label: 'Announcements' }, { to: '/ai', label: 'AI Assistant' },
  ],
  faculty: [
    { to: '/faculty', label: 'Dashboard' }, { to: '/faculty/students', label: 'Student Details' }, { to: '/faculty/marks', label: 'Enter Marks' },
    { to: '/faculty/marksheets', label: 'Upload Marksheet' }, { to: '/faculty/attendance', label: 'Attendance' }, { to: '/faculty/materials', label: 'Study Materials' },
    { to: '/faculty/assignments', label: 'Assignments' }, { to: '/question-banks', label: 'Question Banks' }, { to: '/faculty/subject-requests', label: 'Subject Requests' },
    { to: '/faculty/announcements', label: 'Announcements' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard' }, { to: '/admin/overview', label: 'College Overview' }, { to: '/admin/manage', label: 'Administration' },
    { to: '/admin/announcements', label: 'Announcements' },
  ],
};

const overlayStyle = { position:'fixed', inset:0, zIndex:998, border:0, padding:0, background:'rgba(10,16,31,0.48)', cursor:'pointer' };
const menuButtonStyle = { display:'inline-flex', alignItems:'center', gap:8, minHeight:38, padding:'8px 13px', border:'1px solid var(--ink)', borderRadius:'var(--radius)', background:'var(--ink)', color:'var(--parchment)', cursor:'pointer', fontSize:13, fontWeight:700 };
const menuIconStyle = { display:'inline-flex', flexDirection:'column', justifyContent:'center', gap:3, width:15 };
const menuLineStyle = { display:'block', width:15, height:2, borderRadius:2, background:'currentColor' };

export default function AppShell() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const [menuOpen,setMenuOpen]=useState(false); const items=NAV_BY_ROLE[user.role]||[];
  function handleLogout(){logout();navigate('/login');setMenuOpen(false);}
  const initials=user.fullName.split(' ').map((p)=>p[0]).slice(0,2).join('');
  return <div className="app-shell">
    {menuOpen && <button type="button" aria-label="Close menu" onClick={()=>setMenuOpen(false)} style={overlayStyle} />}
    <aside className="sidebar" aria-hidden={!menuOpen} style={{position:'fixed',top:0,left:0,bottom:0,zIndex:999,width:280,maxWidth:'88vw',overflowY:'auto',boxShadow:menuOpen?'10px 0 30px rgba(0,0,0,0.24)':'none',transform:menuOpen?'translateX(0)':'translateX(-105%)',transition:'transform 180ms ease'}}>
      <div className="brand">EduNex</div><div className="brand-tag">Academic Ledger</div>
      <div style={{fontFamily:'var(--font-mono)',fontSize:10,letterSpacing:'0.12em',textTransform:'uppercase',color:'var(--brass-dim)',marginBottom:10}}>Menu</div>
      <ul className="nav-list">{items.map((item)=><li key={item.to}><NavLink to={item.to} onClick={()=>setMenuOpen(false)} className={({isActive})=>`nav-item${isActive?' active':''}`}>{item.label}</NavLink></li>)}</ul>
      <div className="sidebar-footer"><button className="nav-item" style={{padding:'8px 0',color:'rgba(246,243,236,0.6)'}} onClick={handleLogout}>Sign out</button></div>
    </aside>
    <div className="main-area" style={{width:'100%'}}>
      <header className="topbar"><div style={{display:'flex',alignItems:'center',gap:12}}><button type="button" onClick={()=>setMenuOpen((open)=>!open)} aria-label={menuOpen?'Close menu':'Open menu'} aria-expanded={menuOpen} style={menuButtonStyle}><span aria-hidden="true" style={menuIconStyle}><span style={menuLineStyle}/><span style={menuLineStyle}/><span style={menuLineStyle}/></span><span>{menuOpen?'Close':'Menu'}</span></button><div className="topbar-title">{user.role==='student'?'Student Portal':user.role==='faculty'?'Faculty Portal':'Administrator Portal'}</div></div><div className="user-chip"><span>{user.fullName}</span><div className="user-avatar">{initials}</div></div></header>
      <main className="content"><Outlet/></main>
    </div>
  </div>;
}
