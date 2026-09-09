import { useState } from 'react';
import { api } from '../services/api';

export default function FacultyMarksheets() {
  const [query, setQuery] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [file, setFile] = useState(null);
  const [sgpa, setSgpa] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [resultStatus, setResultStatus] = useState('PASS');
  const [searching, setSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSearch(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSelectedStudent(null);
    setFile(null);

    if (!query.trim()) {
      setStudents([]);
      setError('Enter a student name, student code or email.');
      return;
    }

    try {
      setSearching(true);
      const data = await api.searchStudentsForMarksheet(query.trim());
      setStudents(Array.isArray(data) ? data : []);
      if (!data?.length) setError('No students found.');
    } catch (err) {
      setError(err.message || 'Unable to search students.');
    } finally {
      setSearching(false);
    }
  }

  async function handleUpload(event) {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!selectedStudent) return setError('Select a student first.');
    if (!file) return setError('Select a PDF marksheet.');

    const formData = new FormData();
    formData.append('studentId', selectedStudent.id);
    formData.append('semesterId', selectedStudent.current_semester_id || '');
    formData.append('sgpa', sgpa);
    formData.append('cgpa', cgpa);
    formData.append('resultStatus', resultStatus);
    formData.append('marksheet', file);

    try {
      setUploading(true);
      const response = await api.uploadMarksheet(formData);
      setMessage(response.message || 'Marksheet uploaded and published successfully.');
      setFile(null);
      event.target.reset();
    } catch (err) {
      setError(err.message || 'Unable to upload marksheet.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Upload Marksheet</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            Upload an official PDF marksheet and publish it to the selected student.
          </p>
        </div>
        <span className="count">Faculty</span>
      </div>

      <hr className="ledger-rule" />

      {error && <div className="panel"><div className="error-text">{error}</div></div>}
      {message && <div className="panel"><div className="success-text">{message}</div></div>}

      <div className="panel">
        <div className="ledger-heading">
          <h2>1. Search Student</h2>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, student code or email"
            style={{ flex: '1 1 320px', minWidth: 240 }}
          />
          <button className="btn" type="submit" disabled={searching}>
            {searching ? 'Searching...' : 'Search Student'}
          </button>
        </form>

        {students.length > 0 && (
          <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
            {students.map((student) => {
              const selected = selectedStudent?.id === student.id;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudent(student)}
                  style={{
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 8,
                    border: selected ? '2px solid var(--accent)' : '1px solid var(--line)',
                    background: selected ? 'var(--panel)' : 'transparent',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <strong>{student.student_name}</strong>
                  <div style={{ color: 'var(--muted-text)', marginTop: 4 }}>
                    {student.student_code} · {student.email}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="panel">
          <div className="ledger-heading">
            <div>
              <h2>2. Upload & Publish</h2>
              <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
                {selectedStudent.student_name} · {selectedStudent.student_code} · Semester {selectedStudent.semester_number || '-'}
              </p>
            </div>
            <span className="pill pill-good">Student selected</span>
          </div>

          <form onSubmit={handleUpload} style={{ display: 'grid', gap: 16 }}>
            <label>
              <strong>Marksheet PDF</strong>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                style={{ display: 'block', marginTop: 8 }}
              />
              <small style={{ color: 'var(--muted-text)' }}>PDF only, maximum 15 MB.</small>
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <label>
                <strong>SGPA</strong>
                <input type="number" min="0" max="10" step="0.01" value={sgpa} onChange={(e) => setSgpa(e.target.value)} placeholder="e.g. 8.25" />
              </label>
              <label>
                <strong>CGPA</strong>
                <input type="number" min="0" max="10" step="0.01" value={cgpa} onChange={(e) => setCgpa(e.target.value)} placeholder="e.g. 8.10" />
              </label>
              <label>
                <strong>Result Status</strong>
                <select value={resultStatus} onChange={(e) => setResultStatus(e.target.value)}>
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="ATKT">ATKT</option>
                </select>
              </label>
            </div>

            <div>
              <button className="btn" type="submit" disabled={uploading}>
                {uploading ? 'Uploading...' : 'Upload & Publish Marksheet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
