import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ROLE_DEMO_EMAILS = {
  student: 'kshitijmohankar@gmail.com',
  faculty: 'rohanmehta@gmail.com',
  admin: 'admin1@edunex.edu',
};

export default function Login() {
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState(ROLE_DEMO_EMAILS.student);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Warm the API while the user enters credentials; free hosting may sleep when idle.
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    fetch(`${baseUrl.replace(/\\/$/, '')}/ready`, { method: 'GET' }).catch(() => {});
  }, []);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleRoleChange(newRole) {
    setRole(newRole);
    setEmail(ROLE_DEMO_EMAILS[newRole]);
  }

async function handleSubmit(e) {
  e.preventDefault();
  if (isSubmitting) return;
  setError('');

  if (!email || !password) {
    setError('Enter your email and password to continue.');
    return;
  }

  setIsSubmitting(true);
  try {
    const user = await login(email.trim(), password);

    navigate(
      user.role === 'faculty'
        ? '/faculty'
        : user.role === 'admin'
        ? '/admin'
        : '/dashboard'
    );
  } catch (err) {
    setError(err.message || 'Unable to sign in. Please try again.');
  } finally {
    setIsSubmitting(false);
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

        <button type="submit" className="btn login-submit-button" style={{ width: '100%' }} disabled={isSubmitting} aria-busy={isSubmitting}>
          {isSubmitting && <span className="login-spinner" aria-hidden="true" />}
          <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
        </button>
        <a href="/forgot-password" style={{display:'block',marginTop:12,textAlign:'center'}}>Forgot password?</a>
      </form>
    </div>
  );
}
