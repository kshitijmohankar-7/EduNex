import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function FacultyAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  const [subjectId, setSubjectId] = useState('');
  const [date, setDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const [attendance, setAttendance] = useState({});

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ======================================================
  // LOAD SUBJECTS
  // ======================================================

  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoadingSubjects(true);
        setError('');

        const data = await api.getSubjects();

        setSubjects(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, []);

  // ======================================================
  // LOAD STUDENTS WHEN SUBJECT CHANGES
  // ======================================================

  useEffect(() => {
    if (!subjectId) {
      setStudents([]);
      setAttendance({});
      return;
    }

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        setError('');
        setMessage('');

        const data = await api.getAttendanceStudents(subjectId);

        setStudents(data);

        // Default every student to present
        const initialAttendance = {};

        data.forEach((student) => {
          initialAttendance[student.id] = 'present';
        });

        setAttendance(initialAttendance);
      } catch (err) {
        setError(err.message);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudents();
  }, [subjectId]);

  // ======================================================
  // CHANGE ATTENDANCE
  // ======================================================

  function handleAttendanceChange(studentId, status) {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  }

  // ======================================================
  // MARK ALL PRESENT
  // ======================================================

  function markAllPresent() {
    const updated = {};

    students.forEach((student) => {
      updated[student.id] = 'present';
    });

    setAttendance(updated);
  }

  // ======================================================
  // MARK ALL ABSENT
  // ======================================================

  function markAllAbsent() {
    const updated = {};

    students.forEach((student) => {
      updated[student.id] = 'absent';
    });

    setAttendance(updated);
  }

  // ======================================================
  // SAVE ATTENDANCE
  // ======================================================

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!subjectId) {
      setError('Please select a subject.');
      return;
    }

    if (!date) {
      setError('Please select a date.');
      return;
    }

    if (students.length === 0) {
      setError('No students found for this subject.');
      return;
    }

    try {
      setSaving(true);

      const attendanceData = students.map((student) => ({
        studentId: student.id,
        status: attendance[student.id] || 'absent',
      }));

      // IMPORTANT:
      // Backend expects "classDate", not "date"
      await api.markAttendance({
        subjectId,
        classDate: date,
        attendance: attendanceData,
      });

      setMessage('Attendance saved successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // ======================================================
  // COUNTS
  // ======================================================

  const presentCount = students.filter(
    (student) => attendance[student.id] === 'present'
  ).length;

  const absentCount = students.filter(
    (student) => attendance[student.id] === 'absent'
  ).length;

  // ======================================================
  // UI
  // ======================================================

  return (
    <div>

      <div className="ledger-heading">
        <h2>Mark Attendance</h2>
        <span className="count">Faculty</span>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">

        {message && (
          <div className="success-text">
            {message}
          </div>
        )}

        {error && (
          <div className="error-text">
            {error}
          </div>
        )}

        {/* SUBJECT */}

        <div className="field">

          <label htmlFor="attendance-subject">
            Subject
          </label>

          <select
            id="attendance-subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={loadingSubjects}
          >

            <option value="">
              {loadingSubjects
                ? 'Loading subjects...'
                : 'Select subject'}
            </option>

            {subjects.map((subject) => (
              <option
                key={subject.id}
                value={subject.id}
              >
                {subject.code} - {subject.name}
              </option>
            ))}

          </select>

        </div>

        {/* DATE */}

        <div className="field">

          <label htmlFor="attendance-date">
            Date
          </label>

          <input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

        </div>

        {/* STUDENTS */}

        {loadingStudents && (
          <p>
            Loading students...
          </p>
        )}

        {!loadingStudents &&
          subjectId &&
          students.length > 0 && (

            <>

              {/* SUMMARY */}

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  flexWrap: 'wrap',
                  margin: '20px 0',
                }}
              >

                <div className="stat-card">
                  <div className="stat-label">
                    Students
                  </div>

                  <div className="stat-value">
                    {students.length}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">
                    Present
                  </div>

                  <div className="stat-value">
                    {presentCount}
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-label">
                    Absent
                  </div>

                  <div className="stat-value">
                    {absentCount}
                  </div>
                </div>

              </div>

              {/* QUICK BUTTONS */}

              <div
                style={{
                  display: 'flex',
                  gap: 10,
                  marginBottom: 20,
                  flexWrap: 'wrap',
                }}
              >

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={markAllPresent}
                >
                  Mark All Present
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={markAllAbsent}
                >
                  Mark All Absent
                </button>

              </div>

              {/* TABLE */}

              <form onSubmit={handleSubmit}>

                <table className="ledger-table">

                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>ID</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>

                  <tbody>

                    {students.map((student) => (

                      <tr key={student.id}>

                        <td>
                          {student.name}
                        </td>

                        <td>
                          <span className="code-stamp">
                            {student.student_code}
                          </span>
                        </td>

                        <td>

                          <select
                            value={
                              attendance[student.id] ||
                              'present'
                            }
                            onChange={(e) =>
                              handleAttendanceChange(
                                student.id,
                                e.target.value
                              )
                            }
                          >

                            <option value="present">
                              Present
                            </option>

                            <option value="absent">
                              Absent
                            </option>

                          </select>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>

                <div style={{ marginTop: 20 }}>

                  <button
                    type="submit"
                    className="btn"
                    disabled={saving}
                  >
                    {saving
                      ? 'Saving...'
                      : 'Save Attendance'}
                  </button>

                </div>

              </form>

            </>
          )}

        {!loadingStudents &&
          subjectId &&
          students.length === 0 &&
          !error && (

            <p>
              No students found for this subject.
            </p>

          )}

      </div>

    </div>
  );
}