import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import FacultyStudentDetails from './FacultyStudentDetails';

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [subjectChoices, setSubjectChoices] = useState([]);
  const [loadingChoices, setLoadingChoices] = useState(true);
  const [processingChoice, setProcessingChoice] = useState(null);
  const [error, setError] = useState('');

  async function loadSubjectChoices() {
    try {
      setLoadingChoices(true);
      setError('');
      const data = await api.getSubjectChoices();
      setSubjectChoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load subject requests');
    } finally {
      setLoadingChoices(false);
    }
  }

  useEffect(() => {
    loadSubjectChoices();
  }, []);

  async function handleChoiceAction(choiceId, action) {
    try {
      setProcessingChoice(choiceId);
      setError('');
      if (action === 'approve') await api.approveSubjectChoice(choiceId);
      else await api.rejectSubjectChoice(choiceId);
      await loadSubjectChoices();
    } catch (err) {
      setError(err.message || `Failed to ${action} subject request`);
    } finally {
      setProcessingChoice(null);
    }
  }

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
            Manage student performance, attendance, marks, assignments and certifications.
          </p>
        </div>
      </div>
      <hr className="ledger-rule" />

      {error && <div className="panel"><div className="error-text">{error}</div></div>}

      <div className="panel">
        <div className="ledger-heading">
          <div>
            <h2>Marks Management</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
              Enter subject-wise exam marks or upload an official published marksheet.
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

      <FacultyStudentDetails />

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
                          <button className="btn" disabled={busy} onClick={() => handleChoiceAction(choice.id, 'approve')}>{busy ? 'Processing...' : 'Approve'}</button>
                          <button className="btn btn-outline" disabled={busy} onClick={() => handleChoiceAction(choice.id, 'reject')}>{busy ? 'Processing...' : 'Reject'}</button>
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
    </div>
  );
}
