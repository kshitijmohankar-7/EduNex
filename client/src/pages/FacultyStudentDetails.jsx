import { useState } from 'react';
import { api } from '../services/api';

const EXAM_ORDER = ['CT1', 'CT2', 'INTERNAL', 'EXTERNAL', 'END SEMESTER'];

export default function FacultyStudentDetails() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [details, setDetails] = useState(null);
  const [searching, setSearching] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState('');

  async function handleSearch(e) {
    e?.preventDefault();
    const value = search.trim();
    setError('');
    setDetails(null);
    setSelected(null);
    if (!value) {
      setResults([]);
      return;
    }

    try {
      setSearching(true);
      const data = await api.searchFacultyStudents(value);
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to search students');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function selectStudent(student) {
    setSelected(student);
    setDetails(null);
    setError('');
    try {
      setLoadingDetails(true);
      const data = await api.getFacultyStudentDetails(student.id);
      setDetails(data);
    } catch (err) {
      setError(err.message || 'Failed to load student details');
    } finally {
      setLoadingDetails(false);
    }
  }

  function formatDate(value) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString();
  }

  const submittedCount = Number(details?.assignments?.submitted_count || 0);
  const approvedCount = Number(details?.assignments?.approved_count || 0);
  const pendingCount = Number(details?.assignments?.pending_count || 0);
  const rejectedCount = Number(details?.assignments?.rejected_count || 0);

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Student Details</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            Search a student to view attendance, exam marks, assignment submissions and certificates.
          </p>
        </div>
      </div>
      <hr className="ledger-rule" />

      {error && <div className="panel"><div className="error-text">{error}</div></div>}

      <div className="panel">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search student name, student ID or email..."
            style={{ flex: 1, minWidth: 260, padding: 12, border: '1px solid var(--line)', borderRadius: 6, background: 'var(--panel)', color: 'var(--text)' }}
          />
          <button className="btn" type="submit" disabled={searching}>
            {searching ? 'Searching...' : 'Search Student'}
          </button>
        </form>
      </div>

      {results.length > 0 && !details && (
        <div className="panel">
          <div className="ledger-heading"><h2>Search Results</h2><span className="count">{results.length}</span></div>
          <div style={{ display: 'grid', gap: 8 }}>
            {results.map((student) => (
              <button
                key={student.id}
                type="button"
                onClick={() => selectStudent(student)}
                style={{ textAlign: 'left', padding: 14, border: '1px solid var(--line)', borderRadius: 8, background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}
              >
                <strong>{student.student_name}</strong>
                <div style={{ fontSize: 12, color: 'var(--muted-text)', marginTop: 4 }}>
                  {student.student_code} · {student.email}
                  {student.division ? ` · Division ${student.division}` : ''}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!searching && search.trim() && results.length === 0 && !details && (
        <div className="panel"><p>No students found.</p></div>
      )}

      {loadingDetails && <div className="panel"><p>Loading student details...</p></div>}

      {details && (
        <div>
          <div className="panel">
            <div className="ledger-heading">
              <div>
                <h2>{details.student.student_name}</h2>
                <p style={{ margin: '5px 0 0', color: 'var(--muted-text)' }}>
                  {details.student.student_code} · {details.student.email}
                  {details.student.division ? ` · Division ${details.student.division}` : ''}
                  {details.student.semester_number ? ` · Semester ${details.student.semester_number}` : ''}
                </p>
              </div>
              <button className="btn btn-outline" onClick={() => { setDetails(null); setSelected(null); }}>
                Search Another Student
              </button>
            </div>
          </div>

          <div className="card-grid">
            <div className="stat-card">
              <div className="stat-label">Overall Attendance</div>
              <div className="stat-value">{details.attendance.overallPercentage}%</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Assignments Submitted</div>
              <div className="stat-value">{submittedCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Approved Assignments</div>
              <div className="stat-value">{approvedCount}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Certificates</div>
              <div className="stat-value">{details.achievements.length}</div>
            </div>
          </div>

          <div className="panel">
            <div className="ledger-heading"><h2>Attendance</h2></div>
            {details.attendance.bySubject.length === 0 ? <p>No attendance records found.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ledger-table">
                  <thead><tr><th>Subject</th><th>Code</th><th>Present</th><th>Absent</th><th>Total</th><th>Percentage</th></tr></thead>
                  <tbody>
                    {details.attendance.bySubject.map((row) => (
                      <tr key={row.subject_id}>
                        <td>{row.subject}</td>
                        <td><span className="code-stamp">{row.code}</span></td>
                        <td>{row.present_classes}</td>
                        <td>{row.absent_classes}</td>
                        <td>{row.total_classes}</td>
                        <td>{row.percentage}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="ledger-heading"><h2>Exam Marks</h2><span className="count">{details.marks.length} entries</span></div>
            {details.marks.length === 0 ? <p>No marks entered for this student.</p> : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ledger-table">
                  <thead><tr><th>Subject</th><th>Exam</th><th>Marks</th><th>Grade</th><th>Status</th></tr></thead>
                  <tbody>
                    {details.marks.map((mark) => (
                      <tr key={mark.id}>
                        <td>{mark.subject}<br /><small>{mark.code}</small></td>
                        <td>{mark.exam_type}</td>
                        <td>{mark.obtained_marks} / {mark.max_marks}</td>
                        <td>{mark.grade || '-'}</td>
                        <td><span className={`pill ${mark.published ? 'pill-good' : 'pill-warn'}`}>{mark.published ? 'Published' : 'Draft'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="panel">
            <div className="ledger-heading"><h2>Assignment Submissions</h2></div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="pill pill-good">Approved: {approvedCount}</span>
              <span className="pill pill-warn">Pending: {pendingCount}</span>
              <span className="pill pill-bad">Rejected: {rejectedCount}</span>
              <span className="pill">Total submitted: {submittedCount}</span>
            </div>
          </div>

          <div className="panel">
            <div className="ledger-heading"><h2>Certificates &amp; Achievements</h2><span className="count">{details.achievements.length}</span></div>
            {details.achievements.length === 0 ? <p>No certificates uploaded by this student.</p> : (
              <div style={{ display: 'grid', gap: 10 }}>
                {details.achievements.map((achievement) => (
                  <div key={achievement.id} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 8 }}>
                    <strong>{achievement.title}</strong>
                    <div style={{ color: 'var(--muted-text)', fontSize: 13, marginTop: 4 }}>
                      {achievement.organization} · {formatDate(achievement.achieved_on)}
                    </div>
                    {achievement.description && <p style={{ margin: '8px 0', fontSize: 13 }}>{achievement.description}</p>}
                    {achievement.certificate_path && (
                      <a className="btn btn-outline" href={api.getFileUrl(achievement.certificate_path)} target="_blank" rel="noreferrer">
                        View Certificate
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
