import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjectChoices, setSubjectChoices] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [processingChoice, setProcessingChoice] = useState(null);
  const [error, setError] = useState('');

  async function loadSubjectChoices() {
    try {
      setLoadingChoices(true);
      const data = await api.getSubjectChoices();
      setSubjectChoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load subject requests');
      setSubjectChoices([]);
    } finally {
      setLoadingChoices(false);
    }
  }

  useEffect(() => {
    loadSubjectChoices();
  }, []);

  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoadingSubjects(true);
        const data = await api.getSubjects();
        setSubjects(Array.isArray(data) ? data : []);
        if (data?.length) setSelectedSubject(String(data[0].id));
      } catch (err) {
        setError(err.message || 'Failed to load subjects');
      } finally {
        setLoadingSubjects(false);
      }
    }
    loadSubjects();
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setStudents([]);
      return;
    }

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        const data = await api.getFacultyStudents(selectedSubject);
        setStudents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load students');
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }
    loadStudents();
  }, [selectedSubject]);

  async function handleApprove(choiceId) {
    try {
      setProcessingChoice(choiceId);
      setError('');
      await api.approveSubjectChoice(choiceId);
      await loadSubjectChoices();
    } catch (err) {
      setError(err.message || 'Failed to approve subject request');
    } finally {
      setProcessingChoice(null);
    }
  }

  async function handleReject(choiceId) {
    try {
      setProcessingChoice(choiceId);
      setError('');
      await api.rejectSubjectChoice(choiceId);
      await loadSubjectChoices();
    } catch (err) {
      setError(err.message || 'Failed to reject subject request');
    } finally {
      setProcessingChoice(null);
    }
  }

  if (loadingSubjects) {
    return (
      <div>
        <div className="ledger-heading"><h2>Faculty Dashboard</h2></div>
        <hr className="ledger-rule" />
        <div className="panel"><p>Loading dashboard...</p></div>
      </div>
    );
  }

  const currentSubject = subjects.find((s) => String(s.id) === String(selectedSubject));
  const withAttendance = students.filter((s) => s.attendance !== undefined && s.attendance !== null);
  const averageAttendance = withAttendance.length
    ? Math.round(withAttendance.reduce((sum, s) => sum + Number(s.attendance || 0), 0) / withAttendance.length)
    : 0;
  const withCT2 = students.filter((s) => s.ct2 !== undefined && s.ct2 !== null);
  const averageCT2 = withCT2.length
    ? Math.round(withCT2.reduce((sum, s) => sum + Number(s.ct2 || 0), 0) / withCT2.length)
    : 0;
  const atRisk = students.filter((s) => s.trend === 'declining' || Number(s.attendance || 0) < 75);

  const actionButtonStyle = {
    minHeight: 58,
    fontSize: 15,
    fontWeight: 700,
  };

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Faculty Dashboard</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            Manage attendance, marks, student requests and official marksheets.
          </p>
        </div>
        <span className="count">{currentSubject?.code || 'Faculty'}</span>
      </div>
      <hr className="ledger-rule" />

      {error && <div className="panel"><div className="error-text">{error}</div></div>}

      <div className="panel">
        <div className="ledger-heading">
          <div>
            <h2>Marks Management</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
              Enter subject-wise marks or upload an official published marksheet.
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          <button className="btn" style={actionButtonStyle} onClick={() => navigate('/faculty/marks')}>
            Enter Marks
            <span style={{ display: 'block', fontSize: 12, fontWeight: 400, marginTop: 4, opacity: 0.75 }}>
              Student-wise exam marks
            </span>
          </button>
          <button className="btn btn-outline" style={actionButtonStyle} onClick={() => navigate('/faculty/marksheets')}>
            Upload Marksheet
            <span style={{ display: 'block', fontSize: 12, fontWeight: 400, marginTop: 4, opacity: 0.75 }}>
              PDF marksheet → publish to student
            </span>
          </button>
        </div>
      </div>

      <div className="panel">
        <div className="ledger-heading"><h2>Quick Actions</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
          <button className="btn btn-outline" onClick={() => navigate('/faculty/attendance')}>Mark Attendance</button>
          <button className="btn btn-outline" onClick={() => navigate('/faculty/materials')}>Upload Study Material</button>
          <button className="btn btn-outline" onClick={() => navigate('/faculty/assignments')}>Upload Assignment</button>
        </div>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <h2>Class Overview</h2>
          <span className="count">{students.length} students</span>
        </div>
        <select
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
          style={{ padding: 10, minWidth: 320, maxWidth: '100%', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--text)' }}
        >
          <option value="">Select a subject</option>
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {subject.code ? `${subject.code} — ${subject.name}` : subject.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card-grid">
        <div className="stat-card"><div className="stat-label">Students</div><div className="stat-value">{students.length}</div></div>
        <div className="stat-card"><div className="stat-label">Avg. Attendance</div><div className="stat-value">{averageAttendance}%</div></div>
        <div className="stat-card"><div className="stat-label">Avg. CT-2</div><div className="stat-value">{averageCT2}%</div></div>
        <div className="stat-card"><div className="stat-label">Flagged for Support</div><div className="stat-value">{atRisk.length}</div></div>
      </div>

      <div className="panel">
        <div className="ledger-heading">
          <h2>Pending Subject Requests</h2>
          <span className="count">{subjectChoices.length}</span>
        </div>
        {loadingChoices ? <p>Loading subject requests...</p> : subjectChoices.length === 0 ? <p>No pending subject requests.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ledger-table">
              <thead><tr><th>Student</th><th>ID</th><th>Open Elective</th><th>Liberal Learning</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {subjectChoices.map((choice) => {
                  const busy = processingChoice === choice.id;
                  return (
                    <tr key={choice.id}>
                      <td><strong>{choice.student_name}</strong></td>
                      <td><span className="code-stamp">{choice.student_code}</span></td>
                      <td>{choice.open_elective || '-'}<br /><small>{choice.open_elective_code || ''}</small></td>
                      <td>{choice.liberal_learning || '-'}<br /><small>{choice.liberal_learning_code || ''}</small></td>
                      <td><span className="pill pill-warn">{choice.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <button className="btn" disabled={busy} onClick={() => handleApprove(choice.id)}>{busy ? 'Processing...' : 'Approve'}</button>
                          <button className="btn btn-outline" disabled={busy} onClick={() => handleReject(choice.id)}>{busy ? 'Processing...' : 'Reject'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {atRisk.length > 0 && (
        <div className="panel">
          <div className="ledger-heading"><h2>Suggested Faculty Review</h2></div>
          {atRisk.map((student) => (
            <div key={student.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <strong>{student.full_name || student.name || 'Unknown Student'}</strong> ({student.student_code}) — attendance {student.attendance ?? 'N/A'}%
              <span className="pill pill-bad" style={{ marginLeft: 8 }}>Needs review</span>
            </div>
          ))}
        </div>
      )}

      <div className="panel">
        <div className="ledger-heading"><h2>Students</h2></div>
        {loadingStudents ? <p>Loading students...</p> : students.length === 0 ? <p>No students found for this subject.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ledger-table">
              <thead><tr><th>Student</th><th>ID</th><th>Attendance</th><th>CT-2</th><th>Trend</th></tr></thead>
              <tbody>
                {students.map((student) => {
                  const attendance = Number(student.attendance ?? 0);
                  const trend = student.trend || (attendance < 75 ? 'declining' : 'stable');
                  return (
                    <tr key={student.id}>
                      <td>{student.full_name || student.name || 'Unknown Student'}</td>
                      <td><span className="code-stamp">{student.student_code}</span></td>
                      <td>{attendance}%</td>
                      <td>{student.ct2 ?? '-'}</td>
                      <td><span className={`pill ${trend === 'improving' ? 'pill-good' : trend === 'declining' ? 'pill-bad' : 'pill-warn'}`}>{trend}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
