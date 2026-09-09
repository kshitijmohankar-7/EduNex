import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const EXAM_TYPES = [
  'CT1',
  'CT2',
  'INTERNAL',
  'EXTERNAL',
  'END SEMESTER',
];

const externalOnly = (subject) => {
  const name = String(subject?.name || '').toLowerCase();
  const code = String(subject?.code || '').toLowerCase();
  const category = String(subject?.subject_category || '').toLowerCase();

  return (
    category === 'liberal_learning' ||
    category === 'liberal learning' ||
    name.includes('micro project') ||
    code.includes('micro') ||
    name.includes('lab') ||
    code.includes('lab') ||
    name.includes('liberal learning') ||
    code.startsWith('llm')
  );
};

const calculateGrade = (obtained, maximum) => {
  const obtainedMarks = Number(obtained);
  const maxMarks = Number(maximum);

  if (!Number.isFinite(obtainedMarks) || !Number.isFinite(maxMarks) || maxMarks <= 0) {
    return '-';
  }

  const percentage = (obtainedMarks / maxMarks) * 100;

  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B+';
  if (percentage >= 60) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';

  return 'F';
};

export default function FacultyMarks() {
  // ------------------------------------------------------------
  // Student search
  // ------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [students, setStudents] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // ------------------------------------------------------------
  // Marks
  // ------------------------------------------------------------
  const [examType, setExamType] = useState('CT1');
  const [subjects, setSubjects] = useState([]);

  // Each subject gets its own maximum marks
  // Example:
  // {
  //   1: "20",
  //   2: "25"
  // }
  const [maxMarks, setMaxMarks] = useState({});

  // Each subject gets its own obtained marks
  const [obtainedMarks, setObtainedMarks] = useState({});

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ------------------------------------------------------------
  // Search students
  // ------------------------------------------------------------
  const handleSearch = async (e) => {
    e.preventDefault();

    const value = search.trim();

    if (!value) {
      setStudents([]);
      setError('Enter a student name or student code.');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setSearching(true);

      const result = await api.searchStudentsForMarks(value);

      setStudents(Array.isArray(result) ? result : []);
    } catch (err) {
      console.error(err);
      setStudents([]);
      setError(err.message || 'Unable to search students.');
    } finally {
      setSearching(false);
    }
  };

  // ------------------------------------------------------------
  // Select student
  // ------------------------------------------------------------
  const handleSelectStudent = async (student) => {
    try {
      setSelectedStudent(student);
      setStudents([]);
      setSearch('');
      setError('');
      setSuccess('');

      // Reset current marks
      setMaxMarks({});
      setObtainedMarks({});

      await loadStudentSubjects(student.id);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load student.');
    }
  };

  // ------------------------------------------------------------
  // Load student's enrolled subjects
  // ------------------------------------------------------------
  const loadStudentSubjects = async (studentId) => {
    try {
      setLoadingSubjects(true);
      setError('');

      const response = await api.getStudentSubjectsForMarks(studentId);

      const loadedSubjects = Array.isArray(response)
        ? response
        : Array.isArray(response?.subjects)
          ? response.subjects
          : [];

      setSubjects(loadedSubjects);

      if (!loadedSubjects.length) {
        setError(
          'This student has no approved/enrolled subjects. Check the student subject enrollment and elective approval.'
        );
      }
    } catch (err) {
      console.error(err);
      setSubjects([]);
      setError(err.message || 'Unable to load student subjects.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ------------------------------------------------------------
  // Load marks whenever exam type changes
  // ------------------------------------------------------------
  useEffect(() => {
    if (!selectedStudent) return;

    loadExamMarks(selectedStudent.id, examType);
  }, [selectedStudent, examType]);

  // ------------------------------------------------------------
  // Load existing marks for selected exam
  // ------------------------------------------------------------
  const loadExamMarks = async (studentId, selectedExamType) => {
    try {
      setLoadingSubjects(true);
      setError('');
      setSuccess('');

      const response = await api.getStudentMarksForExam(
        studentId,
        selectedExamType
      );

      const loadedSubjects = Array.isArray(response)
        ? response
        : Array.isArray(response?.subjects)
          ? response.subjects
          : [];

      setSubjects(loadedSubjects);

      const newMaxMarks = {};
      const newObtainedMarks = {};

      loadedSubjects.forEach((subject) => {
        const id = subject.id;

        const mark = subject.mark || subject.marks || null;

        if (mark) {
          if (
            mark.maxMarks !== undefined &&
            mark.maxMarks !== null &&
            mark.maxMarks !== ''
          ) {
            newMaxMarks[id] = String(mark.maxMarks);
          }

          if (
            mark.obtainedMarks !== undefined &&
            mark.obtainedMarks !== null &&
            mark.obtainedMarks !== ''
          ) {
            newObtainedMarks[id] = String(mark.obtainedMarks);
          }
        }
      });

      setMaxMarks(newMaxMarks);
      setObtainedMarks(newObtainedMarks);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to load marks.');
    } finally {
      setLoadingSubjects(false);
    }
  };

  // ------------------------------------------------------------
  // Maximum marks change
  // ------------------------------------------------------------
  const handleMaxMarksChange = (subjectId, value) => {
    setMaxMarks((previous) => ({
      ...previous,
      [subjectId]: value,
    }));

    setError('');
    setSuccess('');
  };

  // ------------------------------------------------------------
  // Obtained marks change
  // ------------------------------------------------------------
  const handleObtainedMarksChange = (subjectId, value) => {
    setObtainedMarks((previous) => ({
      ...previous,
      [subjectId]: value,
    }));

    setError('');
    setSuccess('');
  };

  // ------------------------------------------------------------
  // Search another student
  // ------------------------------------------------------------
  const handleSearchAnotherStudent = () => {
    setSelectedStudent(null);
    setSubjects([]);
    setMaxMarks({});
    setObtainedMarks({});
    setSearch('');
    setStudents([]);
    setError('');
    setSuccess('');
    setExamType('CT1');
  };

  // ------------------------------------------------------------
  // Visible subjects for current exam
  //
  // Lab / Micro Project / Liberal Learning:
  // EXTERNAL ONLY
  //
  // Other subjects:
  // CT1, CT2, INTERNAL, EXTERNAL, END SEMESTER
  // ------------------------------------------------------------
  const visibleSubjects = useMemo(() => {
    if (examType === 'EXTERNAL') {
      return subjects;
    }

    return subjects.filter((subject) => !externalOnly(subject));
  }, [subjects, examType]);

  // ------------------------------------------------------------
  // Validate marks
  // ------------------------------------------------------------
  const validateMarks = () => {
    for (const subject of visibleSubjects) {
      const subjectId = subject.id;

      const maximum = maxMarks[subjectId];
      const obtained = obtainedMarks[subjectId];

      // Allow completely empty rows.
      // Faculty can save marks for only the subjects they have entered.
      if (
        (maximum === undefined || maximum === '') &&
        (obtained === undefined || obtained === '')
      ) {
        continue;
      }

      if (maximum === undefined || maximum === '') {
        return `Enter maximum marks for ${subject.name}.`;
      }

      if (obtained === undefined || obtained === '') {
        return `Enter obtained marks for ${subject.name}.`;
      }

      const max = Number(maximum);
      const obtainedValue = Number(obtained);

      if (!Number.isFinite(max) || max <= 0) {
        return `Maximum marks for ${subject.name} must be greater than 0.`;
      }

      if (!Number.isFinite(obtainedValue) || obtainedValue < 0) {
        return `Obtained marks for ${subject.name} cannot be negative.`;
      }

      if (obtainedValue > max) {
        return `${subject.name}: obtained marks cannot be greater than maximum marks (${max}).`;
      }
    }

    return '';
  };

  // ------------------------------------------------------------
  // Save marks
  // ------------------------------------------------------------
  const handleSaveMarks = async () => {
    if (!selectedStudent) {
      setError('Please select a student first.');
      return;
    }

    const validationError = validateMarks();

    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    const marks = visibleSubjects
      .filter((subject) => {
        const maximum = maxMarks[subject.id];
        const obtained = obtainedMarks[subject.id];

        return (
          maximum !== undefined &&
          maximum !== '' &&
          obtained !== undefined &&
          obtained !== ''
        );
      })
      .map((subject) => ({
        subjectId: subject.id,
        maxMarks: Number(maxMarks[subject.id]),
        obtainedMarks: Number(obtainedMarks[subject.id]),
      }));

    if (!marks.length) {
      setError('Enter marks for at least one subject before saving.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      await api.saveBulkMarks({
        studentId: selectedStudent.id,
        examType,
        marks,
      });

      setSuccess(
        `${examType} marks saved successfully for ${selectedStudent.student_name || selectedStudent.name}.`
      );

      // Reload so the saved values are confirmed from database
      await loadExamMarks(selectedStudent.id, examType);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unable to save marks.');
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="ledger-heading">
            Faculty Marks
            <span className="count">Student-wise entry</span>
          </h1>

          <div className="ledger-rule" />
        </div>
      </div>

      {/* ========================================================
          STUDENT SEARCH
      ======================================================== */}
      {!selectedStudent && (
        <div className="panel">
          <h2>Search Student</h2>

          <form onSubmit={handleSearch}>
            <div className="form-row">
              <div className="form-group">
                <label>Student Name / Student Code</label>

                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="e.g. Kshitij or CSE2025001"
                />
              </div>

              <button
                type="submit"
                className="btn"
                disabled={searching}
              >
                {searching ? 'Searching...' : 'Search Student'}
              </button>
            </div>
          </form>

          {students.length > 0 && (
            <div className="student-results">
              <h3>Search Results</h3>

              {students.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  className="student-result"
                  onClick={() => handleSelectStudent(student)}
                >
                  <div>
                    <strong>
                      {student.student_name || student.name}
                    </strong>

                    <span>
                      {student.student_code || student.code || ''}
                    </span>

                    {student.email && (
                      <small>{student.email}</small>
                    )}
                  </div>

                  <span> Select → </span>
                </button>
              ))}
            </div>
          )}

          {!searching &&
            search.trim() &&
            students.length === 0 &&
            !error && (
              <p>No students found.</p>
            )}
        </div>
      )}

      {/* ========================================================
          SELECTED STUDENT
      ======================================================== */}
      {selectedStudent && (
        <>
          <div className="panel student-header">
            <div>
              <h2>
                {selectedStudent.student_name ||
                  selectedStudent.name}
              </h2>

              <p>
                {selectedStudent.student_code ||
                  selectedStudent.code ||
                  ''}
              </p>

              {selectedStudent.email && (
                <p>{selectedStudent.email}</p>
              )}
            </div>

            <button
              type="button"
              className="btn"
              onClick={handleSearchAnotherStudent}
            >
              Search Another Student
            </button>
          </div>

          {/* ======================================================
              EXAM TYPE
          ====================================================== */}
          <div className="panel">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="examType">
                  Exam Type
                </label>

                <select
                  id="examType"
                  value={examType}
                  onChange={(e) =>
                    setExamType(e.target.value)
                  }
                >
                  {EXAM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="helper-text">
              Maximum marks and obtained marks are entered
              separately for every subject.
            </p>

            <p className="helper-text">
              Micro Project, Lab and Liberal Learning subjects
              are EXTERNAL-only.
            </p>
          </div>

          {/* ======================================================
              MARKS TABLE
          ====================================================== */}
          <div className="panel">
            <div className="marks-title">
              <h2>
                {examType} Marks
                <span className="count">
                  {visibleSubjects.length} subjects
                </span>
              </h2>
            </div>

            {loadingSubjects ? (
              <p>Loading subjects...</p>
            ) : visibleSubjects.length === 0 ? (
              <p>
                This student has no subjects available for{' '}
                {examType}.
              </p>
            ) : (
              <div className="table-wrapper">
                <table className="marks-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>SUBJECT</th>
                      <th>CODE</th>
                      <th>MAXIMUM MARKS</th>
                      <th>OBTAINED MARKS</th>
                      <th>GRADE</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleSubjects.map(
                      (subject, index) => {
                        const subjectId = subject.id;

                        const maximum =
                          maxMarks[subjectId] ?? '';

                        const obtained =
                          obtainedMarks[subjectId] ?? '';

                        const grade =
                          calculateGrade(
                            obtained,
                            maximum
                          );

                        return (
                          <tr key={subjectId}>
                            <td>{index + 1}</td>

                            <td>
                              <strong>
                                {subject.name}
                              </strong>

                              {externalOnly(subject) && (
                                <small className="subject-note">
                                  EXTERNAL ONLY
                                </small>
                              )}
                            </td>

                            <td>
                              <span className="subject-code">
                                {subject.code}
                              </span>
                            </td>

                            {/* ----------------------------------
                                MAXIMUM MARKS
                            ---------------------------------- */}
                            <td>
                              <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={maximum}
                                placeholder="Max Marks"
                                onChange={(e) =>
                                  handleMaxMarksChange(
                                    subjectId,
                                    e.target.value
                                  )
                                }
                              />
                            </td>

                            {/* ----------------------------------
                                OBTAINED MARKS
                            ---------------------------------- */}
                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={obtained}
                                placeholder="Obtained"
                                onChange={(e) =>
                                  handleObtainedMarksChange(
                                    subjectId,
                                    e.target.value
                                  )
                                }
                              />
                            </td>

                            {/* ----------------------------------
                                GRADE
                            ---------------------------------- */}
                            <td>
                              <strong>{grade}</strong>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {visibleSubjects.length > 0 && (
              <div className="marks-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={handleSaveMarks}
                  disabled={saving || loadingSubjects}
                >
                  {saving ? 'Saving...' : 'Save Marks'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ========================================================
          MESSAGES
      ======================================================== */}
      {error && (
        <div className="error-text">
          {error}
        </div>
      )}

      {success && (
        <div className="success-text">
          {success}
        </div>
      )}
    </div>
  );
}