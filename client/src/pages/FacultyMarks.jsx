import { useState } from 'react';
import { api } from '../services/api';

const EXAM_TYPES = ['CT1', 'CT2', 'INTERNAL', 'EXTERNAL', 'END SEMESTER'];

const inputStyle = {
  width: '100%',
  padding: '9px 10px',
  border: '1px solid var(--line)',
  borderRadius: 6,
  background: 'transparent',
  color: 'inherit',
  boxSizing: 'border-box',
};

export default function FacultyMarks() {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [student, setStudent] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [examType, setExamType] = useState('CT1');
  const [marks, setMarks] = useState({});
  const [maxMarks, setMaxMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    setMessage('');
    setSearchResults([]);

    if (!search.trim()) {
      setError('Enter student name or student code.');
      return;
    }

    try {
      setSearching(true);
      const data = await api.searchStudentsForMarks(search.trim());
      const results = Array.isArray(data) ? data : [];
      setSearchResults(results);
      if (!results.length) setError('No student found.');
    } catch (err) {
      setError(err.message || 'Unable to search students.');
    } finally {
      setSearching(false);
    }
  }

  async function selectStudent(selectedStudent) {
    setError('');
    setMessage('');
    setStudent(selectedStudent);
    setSearch(selectedStudent.student_code || selectedStudent.student_name || '');
    setSearchResults([]);
    setSubjects([]);
    setMarks({});
    setMaxMarks({});

    try {
      setLoading(true);
      const data = await api.getStudentSubjectsForMarks(selectedStudent.id);
      const loadedStudent = data?.student || selectedStudent;
      const loadedSubjects = Array.isArray(data?.subjects) ? data.subjects : [];
      setStudent(loadedStudent);
      setSubjects(loadedSubjects);
      await loadMarks(selectedStudent.id, examType, loadedSubjects);
    } catch (err) {
      setError(err.message || 'Unable to load student subjects.');
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadMarks(studentId, selectedExam, subjectList = subjects) {
    if (!studentId) return;

    try {
      setLoading(true);
      const data = await api.getStudentMarksForExam(studentId, selectedExam);
      const loadedSubjects = Array.isArray(data?.subjects) ? data.subjects : subjectList;
      setSubjects(loadedSubjects || []);

      const nextMarks = {};
      const nextMaxMarks = {};

      (loadedSubjects || []).forEach((subject) => {
        nextMarks[subject.id] =
          subject.mark?.obtainedMarks !== undefined && subject.mark?.obtainedMarks !== null
            ? String(subject.mark.obtainedMarks)
            : '';

        nextMaxMarks[subject.id] =
          subject.mark?.maxMarks !== undefined && subject.mark?.maxMarks !== null
            ? String(subject.mark.maxMarks)
            : '';
      });

      setMarks(nextMarks);
      setMaxMarks(nextMaxMarks);
    } catch (err) {
      setError(err.message || 'Unable to load existing marks.');
      setMarks({});
      setMaxMarks({});
    } finally {
      setLoading(false);
    }
  }

  async function handleExamChange(e) {
    const selectedExam = e.target.value;
    setExamType(selectedExam);
    setError('');
    setMessage('');
    if (student) await loadMarks(student.id, selectedExam, subjects);
  }

  function handleNumericChange(setter, subjectId, value) {
    if (value !== '' && !/^\d*\.?\d*$/.test(value)) return;
    setter((previous) => ({ ...previous, [subjectId]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!student) {
      setError('Please select a student first.');
      return;
    }

    const applicableSubjects = subjects.filter(
      (subject) => !subject.externalOnly || examType === 'EXTERNAL'
    );

    const marksData = [];

    for (const subject of applicableSubjects) {
      const obtainedValue = marks[subject.id];
      const maxValue = maxMarks[subject.id];

      // Blank rows are allowed; this lets faculty save only entered marks.
      if (obtainedValue === '' || obtainedValue === undefined || obtainedValue === null) continue;

      if (maxValue === '' || maxValue === undefined || maxValue === null) {
        setError(`Enter maximum marks for ${subject.name}.`);
        return;
      }

      const max = Number(maxValue);
      const obtained = Number(obtainedValue);

      if (!Number.isFinite(max) || max <= 0) {
        setError(`Maximum marks for ${subject.name} must be greater than 0.`);
        return;
      }

      if (!Number.isFinite(obtained) || obtained < 0 || obtained > max) {
        setError(`Marks for ${subject.name} must be between 0 and ${max}.`);
        return;
      }

      marksData.push({
        subjectId: Number(subject.id),
        maxMarks: max,
        obtainedMarks: obtained,
      });
    }

    if (!marksData.length) {
      setError('Enter at least one subject mark.');
      return;
    }

    try {
      setSaving(true);
      const result = await api.saveBulkMarks({
        studentId: student.id,
        examType,
        marks: marksData,
      });

      setMessage(result?.message || 'Marks saved successfully.');
      await loadMarks(student.id, examType, subjects);
    } catch (err) {
      setError(err.message || 'Unable to save marks.');
    } finally {
      setSaving(false);
    }
  }

  function handleAnotherStudent() {
    setStudent(null);
    setSubjects([]);
    setMarks({});
    setMaxMarks({});
    setSearch('');
    setSearchResults([]);
    setError('');
    setMessage('');
    setExamType('CT1');
  }

  const visibleSubjects = subjects.filter(
    (subject) => !subject.externalOnly || examType === 'EXTERNAL'
  );

  return (
    <div>
      <div className="ledger-heading">
        <h2>Faculty Marks</h2>
        <span className="count">Student-wise entry</span>
      </div>
      <hr className="ledger-rule" />

      {error && (
        <div className="panel" style={{ borderColor: 'crimson', marginBottom: 15 }}>
          <div className="error-text">{error}</div>
        </div>
      )}

      {message && (
        <div className="panel" style={{ borderColor: 'green', marginBottom: 15 }}>
          <div>{message}</div>
        </div>
      )}

      {!student ? (
        <div className="panel">
          <h3>1. Search Student</h3>
          <form
            onSubmit={handleSearch}
            style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 15 }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Student name or student code"
              style={{ ...inputStyle, flex: 1, minWidth: 280 }}
            />
            <button type="submit" className="btn" disabled={searching}>
              {searching ? 'Searching...' : 'Search Student'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div style={{ marginTop: 15 }}>
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() => selectStudent(result)}
                  style={{
                    display: 'block',
                    width: '100%',
                    textAlign: 'left',
                    padding: 12,
                    marginBottom: 8,
                    cursor: 'pointer',
                    background: 'transparent',
                    border: '1px solid var(--line)',
                    color: 'inherit',
                    borderRadius: 6,
                  }}
                >
                  <strong>{result.student_name}</strong>
                  <br />
                  <span style={{ fontSize: 13, color: 'var(--muted-text)' }}>
                    {result.student_code} · {result.email}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="panel" style={{ marginBottom: 15 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 15, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ marginBottom: 5 }}>Selected Student</h3>
                <strong>{student.student_name}</strong>
                <div style={{ color: 'var(--muted-text)', fontSize: 13 }}>
                  {student.student_code}{student.email ? ` · ${student.email}` : ''}
                </div>
              </div>
              <button type="button" className="btn" onClick={handleAnotherStudent}>
                Search Another Student
              </button>
            </div>
          </div>

          <div className="panel" style={{ marginBottom: 15 }}>
            <h3>2. Select Examination</h3>
            <select value={examType} onChange={handleExamChange} style={{ ...inputStyle, marginTop: 12, maxWidth: 360 }}>
              {EXAM_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <p style={{ marginBottom: 0, color: 'var(--muted-text)', fontSize: 13 }}>
              Lab subjects, Micro Project and Liberal Learning are available only under EXTERNAL.
            </p>
          </div>

          <div className="panel">
            <h3>3. Enter Marks — {examType}</h3>
            {loading ? (
              <p>Loading subjects and marks...</p>
            ) : visibleSubjects.length === 0 ? (
              <p>No enrolled subjects are available for this examination.</p>
            ) : (
              <form onSubmit={handleSave}>
                <div style={{ overflowX: 'auto', marginTop: 15 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: 'left', padding: 10 }}>Subject</th>
                        <th style={{ textAlign: 'left', padding: 10 }}>Code</th>
                        <th style={{ textAlign: 'left', padding: 10, width: 150 }}>Maximum Marks</th>
                        <th style={{ textAlign: 'left', padding: 10, width: 150 }}>Obtained Marks</th>
                        <th style={{ textAlign: 'left', padding: 10 }}>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSubjects.map((subject) => {
                        const max = Number(maxMarks[subject.id]);
                        const obtained = Number(marks[subject.id]);
                        const grade =
                          Number.isFinite(max) && max > 0 && Number.isFinite(obtained)
                            ? obtained / max >= 0.9 ? 'A+' : obtained / max >= 0.8 ? 'A' : obtained / max >= 0.7 ? 'B+' : obtained / max >= 0.6 ? 'B' : obtained / max >= 0.5 ? 'C' : obtained / max >= 0.4 ? 'D' : 'F'
                            : '—';

                        return (
                          <tr key={subject.id}>
                            <td style={{ padding: 10 }}>
                              <strong>{subject.name}</strong>
                              {subject.externalOnly && (
                                <div style={{ fontSize: 12, color: 'var(--muted-text)' }}>External only</div>
                              )}
                            </td>
                            <td style={{ padding: 10 }}>{subject.code}</td>
                            <td style={{ padding: 10 }}>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={maxMarks[subject.id] || ''}
                                onChange={(e) => handleNumericChange(setMaxMarks, subject.id, e.target.value)}
                                placeholder="e.g. 20"
                                style={inputStyle}
                              />
                            </td>
                            <td style={{ padding: 10 }}>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={marks[subject.id] || ''}
                                onChange={(e) => handleNumericChange(setMarks, subject.id, e.target.value)}
                                placeholder="Obtained"
                                style={inputStyle}
                              />
                            </td>
                            <td style={{ padding: 10, fontWeight: 600 }}>{grade}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 20, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button type="submit" className="btn" disabled={saving}>
                    {saving ? 'Saving...' : 'Save Marks'}
                  </button>
                  <span style={{ color: 'var(--muted-text)', fontSize: 13 }}>
                    Maximum marks are set separately for every subject.
                  </span>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
