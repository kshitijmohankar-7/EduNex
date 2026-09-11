import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        const data = await api.getDashboard();
        setDashboard(data);
      } catch (err) {
        setError(err.message || 'Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return <div className="panel"><p>Loading student dashboard...</p></div>;
  }

  if (error) {
    return <div className="panel"><div className="error-text">{error}</div></div>;
  }

  if (!dashboard) {
    return <div className="panel">No dashboard data available.</div>;
  }

  const { profile, attendance } = dashboard;
  const firstName = profile.full_name?.split(' ')[0] || 'Student';
  const overallAttendance = Number(attendance?.overallPercentage || 0);

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Welcome back, {firstName}</h2>
          <span className="count">
            {profile.course || 'B.Tech'} · Sem {profile.semester || '-'} · Div {profile.division || '-'}
          </span>
        </div>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">
        <div className="ledger-heading">
          <div>
            <h2>Overall Attendance</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
              Your current overall attendance percentage.
            </p>
          </div>
          <span className={`pill ${overallAttendance >= 75 ? 'pill-good' : 'pill-bad'}`}>
            {overallAttendance >= 75 ? 'On track' : 'Below 75%'}
          </span>
        </div>
        <div className="stat-value" style={{ fontSize: 46 }}>{overallAttendance}%</div>
        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => navigate('/attendance')}>
          View detailed attendance
        </button>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <div>
            <h2>Student Details</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
              Your basic academic and contact information.
            </p>
          </div>
          <button className="btn btn-outline" onClick={() => navigate('/profile')}>
            Open Profile
          </button>
        </div>

        <table className="ledger-table">
          <tbody>
            <tr><td><strong>Student ID</strong></td><td>{profile.student_code || '-'}</td></tr>
            <tr><td><strong>Name</strong></td><td>{profile.full_name || '-'}</td></tr>
            <tr><td><strong>Department</strong></td><td>{profile.department || '-'}</td></tr>
            <tr><td><strong>Course</strong></td><td>{profile.course || '-'}</td></tr>
            <tr><td><strong>Semester</strong></td><td>{profile.semester || '-'}</td></tr>
            <tr><td><strong>Division</strong></td><td>{profile.division || '-'}</td></tr>
            <tr><td><strong>Academic Year</strong></td><td>{profile.academic_year || '-'}</td></tr>
            <tr><td><strong>Email</strong></td><td>{profile.email || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
