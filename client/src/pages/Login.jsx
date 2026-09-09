import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_DEMO_EMAILS = {
  student: 'student1@edunex.edu',
  faculty: 'faculty1@edunex.edu',
  admin: 'admin1@edunex.edu',
};

export default function Login() {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState(ROLE_DEMO_EMAILS.student);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleRoleChange(newRole) {
    setRole(newRole);
    setEmail(ROLE_DEMO_EMAILS[newRole]);
  }

async function handleSubmit(e) {
  e.preventDefault();
  setError('');

  if (!email || !password) {
    setError('Enter your email and password to continue.');
    return;
  }

  try {
    const user = await login(email, password);

    navigate(
      user.role === 'faculty'
        ? '/faculty'
        : user.role === 'admin'
        ? '/admin'
        : '/dashboard'
    );
  } catch (err) {
    setError(err.message);
  }
}

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">EduNex</div>
        <div className="login-tag">One Platform. Every Student.</div>

        <div className="role-toggle">
          {['student', 'faculty', 'admin'].map((r) => (
            <button type="button" key={r} className={role === r ? 'active' : ''} onClick={() => handleRoleChange(r)}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {error && <div className="error-text">{error}</div>}

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" />
        </div>

        <button type="submit" className="btn" style={{ width: '100%' }}>Sign in</button>
      </form>
    </div>
  );
}
