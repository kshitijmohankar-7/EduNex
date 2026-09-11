import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function FacultySubjectRequests() {
  const [subjectChoices, setSubjectChoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingChoice, setProcessingChoice] = useState(null);
  const [error, setError] = useState('');

  async function loadSubjectChoices() {
    try {
      setLoading(true);
      setError('');
      const data = await api.getSubjectChoices();
      setSubjectChoices(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load subject requests');
    } finally {
      setLoading(false);
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

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Subject Requests</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            Review and approve or reject student elective and liberal learning requests.
          </p>
        </div>
        {!loading && <span className="count">{subjectChoices.length} pending</span>}
      </div>
      <hr className="ledger-rule" />

      {error && <div className="panel"><div className="error-text">{error}</div></div>}

      <div className="panel">
        {loading ? <p>Loading subject requests...</p> : subjectChoices.length === 0 ? <p>No pending subject requests.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ledger-table">
              <thead>
                <tr><th>Student</th><th>ID</th><th>Open Elective</th><th>Liberal Learning</th><th>Status</th><th>Action</th></tr>
              </thead>
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
                          <button className="btn" disabled={busy} onClick={() => handleChoiceAction(choice.id, 'approve')}>
                            {busy ? 'Processing...' : 'Approve'}
                          </button>
                          <button className="btn btn-outline" disabled={busy} onClick={() => handleChoiceAction(choice.id, 'reject')}>
                            {busy ? 'Processing...' : 'Reject'}
                          </button>
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
