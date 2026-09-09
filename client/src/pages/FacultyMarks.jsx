import { useState } from 'react';
import { api } from '../services/api';

const EXAM_TYPES = ['CT1', 'CT2', 'INTERNAL', 'EXTERNAL', 'END SEMESTER'];

const isExternalOnly = (subject) => Boolean(subject?.externalOnly);

function calculateGrade(obtained, maximum) {
  const o = Number(obtained);
  const m = Number(maximum);
  if (!Number.isFinite(o) || !Number.isFinite(m) || m <= 0) return '—';
  const percentage = (o / m) * 100;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
}

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
      (subject) => !isExternalOnly(subject) || examType === 'EXTERNAL'
    );
    const marksData = [];

    for (const subject of applicableSubjects) {
      const obtainedValue = marks[subject.id];
      const maxValue = maxMarks[subject.id];
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
    (subject) => !isExternalOnly(subject) || examType === 'EXTERNAL'
  );

  return (
    <div className="faculty-marks-page">
      <div className="marks-hero">
        <div>
          <h1>Faculty Marks</h1>
          <p>Enter examination marks student-by-student.</p>
        </div>
        <div className="marks-step"><strong>MARKS</strong> / FACULTY ENTRY</div>
      </div>
      <hr className="ledger-rule" />

      {error && <div className="error-box">{error}</div>}
      {message && <div className="message">{message}</div>}

      {!student ? (
        <div className="panel marks-card">
          <div className="section-title">
            <h3>1. Search Student</h3>
          </div>
          <form onSubmit={handleSearch}>
            <label className="field-label">Student name or student code</label>
            <div className="search-row">
              <input
                className="marks-input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g. Kshitij or CSE2025001"
              />
              <button type="submit" className="btn" disabled={searching}>
                {searching ? 'Searching...' : 'Search Student'}
              </button>
            </div>
          </form>

          {searchResults.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <label className="field-label">Search results</label>
              {searchResults.map((result) => (
                <button key={result.id} type="button" className="student-result" onClick={() => selectStudent(result)}>
                  <span>
                    <strong>{result.student_name}</strong>
                    <small>{result.student_code}{result.email ? ` · ${result.email}` : ''}</small>
                  </span>
                  <strong>Select →</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="panel marks-card">
            <div className="student-banner">
              <div>
                <div className="field-label">Selected student</div>
                <h3>{student.student_name}</h3>
                <div className="student-meta">
                  {student.student_code}{student.email ? ` · ${student.email}` : ''}
                </div>
              </div>
              <button type="button" className="btn btn-outline" onClick={handleAnotherStudent}>
                Search Another Student
              </button>
            </div>
          </div>

          <div className="panel marks-card">
            <div className="section-title">
              <h3>2. Select Examination</h3>
            </div>
            <div className="exam-row">
              <div>
                <label className="field-label">Examination type</label>
                <select className="exam-select" value={examType} onChange={handleExamChange}>
                  {EXAM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <p className="exam-note">
                <strong>External-only:</strong> Lab subjects, Micro Project and Liberal Learning appear only under EXTERNAL.
                Open Elective remains a regular subject.
              </p>
            </div>
          </div>

          <div className="panel marks-card">
            <div className="section-title">
              <h3>3. {examType} Marks</h3>
              <span className="count">{visibleSubjects.length} subjects</span>
            </div>

            {loading ? (
              <p>Loading subjects and marks...</p>
            ) : visibleSubjects.length === 0 ? (
              <p>No enrolled subjects are available for {examType}.</p>
            ) : (
              <form onSubmit={handleSave}>
                <div className="marks-table-wrap">
                  <table className="marks-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Subject</th>
                        <th>Code</th>
                        <th>Maximum</th>
                        <th>Obtained</th>
                        <th>Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleSubjects.map((subject, index) => (
                        <tr key={subject.id}>
                          <td>{String(index + 1).padStart(2, '0')}</td>
                          <td>
                            <div className="subject-name">{subject.name}</div>
                            {subject.externalOnly && <span className="subject-note">External only</span>}
                          </td>
                          <td><span className="subject-code">{subject.code}</span></td>
                          <td>
                            <input
                              className="mark-input"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={maxMarks[subject.id] || ''}
                              onChange={(e) => handleNumericChange(setMaxMarks, subject.id, e.target.value)}
                              placeholder="e.g. 20"
                            />
                          </td>
                          <td>
                            <input
                              className="mark-input"
                              type="number"
                              min="0"
                              step="0.01"
                              value={marks[subject.id] || ''}
                              onChange={(e) => handleNumericChange(setMarks, subject.id, e.target.value)}
                              placeholder="Obtained"
                            />
                          </td>
                          <td className="grade-cell">
                            {calculateGrade(marks[subject.id], maxMarks[subject.id])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="marks-footer">
                  <button type="submit" className="btn" disabled={saving}>
                    {saving ? 'Saving Marks...' : `Save ${examType} Marks`}
                  </button>
                  <span style={{ color: 'var(--muted-text)', fontSize: 12 }}>
                    Maximum and obtained marks are stored separately for every subject.
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
