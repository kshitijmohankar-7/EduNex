import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import Announcements from '../components/Announcements';

function calculateAverage(marks, examType) {
  const filtered = marks.filter(
    (m) => m.exam_type?.toLowerCase() === examType
  );

  if (filtered.length === 0) return 0;

  const total = filtered.reduce(
    (sum, m) => sum + Number(m.obtained_marks || 0),
    0
  );

  const max = filtered.reduce(
    (sum, m) => sum + Number(m.max_marks || 0),
    0
  );

  return max > 0 ? Number(((total / max) * 100).toFixed(1)) : 0;
}

function getAssignmentStatus(assignment) {
  const status = String(
    assignment.status || assignment.submission_status || ''
  ).toLowerCase();

  if (status === 'submitted' || status === 'completed') {
    return 'submitted';
  }

  return 'pending';
}

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
    return (
      <div className="panel">
        <p>Loading student dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  if (!dashboard) {
    return <div className="panel">No dashboard data available.</div>;
  }

  const { profile, attendance, marks = [], assignments = [] } = dashboard;

  const ct1Average = calculateAverage(marks, 'ct1');
  const ct2Average = calculateAverage(marks, 'ct2');

  const pendingAssignments = assignments.filter(
    (a) => getAssignmentStatus(a) === 'pending'
  );

  const submittedAssignments = assignments.filter(
    (a) => getAssignmentStatus(a) === 'submitted'
  );

  const performanceData = [
    { test: 'CT-1', percentage: ct1Average },
    { test: 'CT-2', percentage: ct2Average },
  ];

  const firstName = profile.full_name?.split(' ')[0] || 'Student';

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

      <div className="card-grid">
        <div className="stat-card">
          <div className="stat-label">Attendance</div>
          <div className="stat-value">{attendance.overallPercentage || 0}%</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">CT-1 Average</div>
          <div className="stat-value">{ct1Average}%</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">CT-2 Average</div>
          <div className="stat-value">{ct2Average}%</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Assignments</div>
          <div className="stat-value">{submittedAssignments.length}/{assignments.length}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Pending</div>
          <div className="stat-value">{pendingAssignments.length}</div>
        </div>
      </div>

      <Announcements compact />

      <div className="panel">
        <div className="ledger-heading">
          <div>
            <h2>🤖 EduNex AI Assistant</h2>
            <span className="count">Ask questions about your academic progress</span>
          </div>
          <button className="btn" onClick={() => navigate('/ai')}>
            Open AI Chat
          </button>
        </div>
        <p style={{ color: 'var(--muted-text)', marginBottom: 14 }}>
          Get personalized help with your attendance, published marks, assignments,
          study materials, and study planning.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="suggestion-chip" onClick={() => navigate('/ai')}>
            What is my attendance?
          </button>
          <button className="suggestion-chip" onClick={() => navigate('/ai')}>
            Show my marks
          </button>
          <button className="suggestion-chip" onClick={() => navigate('/ai')}>
            Help me make a study plan
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <h2>Recent test performance</h2>
          <span className="count">CT-1 / CT-2</span>
        </div>

        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={performanceData}>
            <CartesianGrid stroke="rgba(28,27,24,0.08)" vertical={false} />
            <XAxis dataKey="test" tick={{ fontSize: 12 }} stroke="#6B6558" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="#6B6558" />
            <Tooltip />
            <Line type="monotone" dataKey="percentage" stroke="#B08D57" strokeWidth={2.5} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <h2>Subject Selection</h2>
        </div>
        <p style={{ color: 'var(--muted-text)' }}>
          Choose your Open Elective and Liberal Learning Module.
        </p>
        <button className="btn" onClick={() => navigate('/student/electives')}>
          Choose Elective Subjects
        </button>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <h2>Attendance overview</h2>
          <span className="count">Overall: {attendance.overallPercentage || 0}%</span>
        </div>

        <table className="ledger-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Code</th>
              <th>Attendance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {(attendance.bySubject || []).map((subject) => (
              <tr key={subject.code}>
                <td>{subject.subject}</td>
                <td><span className="code-stamp">{subject.code}</span></td>
                <td>{subject.presentCount}/{subject.totalCount} ({subject.percentage}%)</td>
                <td>
                  <span className={`pill ${subject.percentage >= 75 ? 'pill-good' : 'pill-bad'}`}>
                    {subject.percentage >= 75 ? 'On track' : 'Below 75%'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => navigate('/attendance')}>
          View detailed attendance
        </button>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <h2>Pending assignments</h2>
          <span className="count">{pendingAssignments.length} pending</span>
        </div>

        {pendingAssignments.length === 0 ? (
          <p>No pending assignments.</p>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Title</th>
                <th>Deadline</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pendingAssignments.slice(0, 5).map((assignment) => (
                <tr key={assignment.id}>
                  <td>{assignment.subject || assignment.subject_code || '-'}</td>
                  <td>{assignment.title}</td>
                  <td>{assignment.deadline || '-'}</td>
                  <td><span className="pill pill-warn">Pending</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className="btn btn-outline" style={{ marginTop: 14 }} onClick={() => navigate('/assignments')}>
          View all assignments
        </button>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <h2>Student information</h2>
          <button className="btn btn-outline" onClick={() => navigate('/profile')}>
            View profile
          </button>
        </div>

        <table className="ledger-table">
          <tbody>
            <tr><td><strong>Student ID</strong></td><td>{profile.student_code || '-'}</td></tr>
            <tr><td><strong>Department</strong></td><td>{profile.department || '-'}</td></tr>
            <tr><td><strong>Course</strong></td><td>{profile.course || '-'}</td></tr>
            <tr><td><strong>Email</strong></td><td>{profile.email || '-'}</td></tr>
            <tr><td><strong>Academic Year</strong></td><td>{profile.academic_year || '-'}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
