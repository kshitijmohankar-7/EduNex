import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function FacultyDashboard() {
  const navigate = useNavigate();

  // =====================================================
  // STATE
  // =====================================================

  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjectChoices, setSubjectChoices] = useState([]);

  const [selectedSubject, setSelectedSubject] = useState('');

  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingChoices, setLoadingChoices] = useState(true);

  const [processingChoice, setProcessingChoice] = useState(null);

  const [error, setError] = useState('');

  // =====================================================
  // LOAD SUBJECT CHOICES
  // =====================================================

  async function loadSubjectChoices() {
    try {
      setLoadingChoices(true);

      const data = await api.getSubjectChoices();

      setSubjectChoices(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        'Failed to load subject choices:',
        err
      );

      setError(
        err.message ||
        'Failed to load subject requests'
      );

      setSubjectChoices([]);
    } finally {
      setLoadingChoices(false);
    }
  }

  useEffect(() => {
    loadSubjectChoices();
  }, []);

  // =====================================================
  // APPROVE SUBJECT CHOICE
  // =====================================================

  async function handleApprove(choiceId) {
    try {
      setProcessingChoice(choiceId);
      setError('');

      await api.approveSubjectChoice(choiceId);

      // Reload pending requests
      await loadSubjectChoices();

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        'Failed to approve subject request'
      );
    } finally {
      setProcessingChoice(null);
    }
  }

  // =====================================================
  // REJECT SUBJECT CHOICE
  // =====================================================

  async function handleReject(choiceId) {
    try {
      setProcessingChoice(choiceId);
      setError('');

      await api.rejectSubjectChoice(choiceId);

      // Reload pending requests
      await loadSubjectChoices();

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
        'Failed to reject subject request'
      );
    } finally {
      setProcessingChoice(null);
    }
  }

  // =====================================================
  // LOAD SUBJECTS
  // =====================================================

  useEffect(() => {
    async function loadSubjects() {
      try {
        setLoadingSubjects(true);
        setError('');

        const data = await api.getSubjects();

        setSubjects(
          Array.isArray(data) ? data : []
        );

        if (
          Array.isArray(data) &&
          data.length > 0
        ) {
          setSelectedSubject(
            String(data[0].id)
          );
        }
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
          'Failed to load subjects'
        );
      } finally {
        setLoadingSubjects(false);
      }
    }

    loadSubjects();
  }, []);

  // =====================================================
  // LOAD STUDENTS WHEN SUBJECT CHANGES
  // =====================================================

  useEffect(() => {
    if (!selectedSubject) {
      setStudents([]);
      return;
    }

    async function loadStudents() {
      try {
        setLoadingStudents(true);
        setError('');

        const data =
          await api.getFacultyStudents(
            selectedSubject
          );

        setStudents(
          Array.isArray(data) ? data : []
        );
      } catch (err) {
        console.error(err);

        setError(
          err.message ||
          'Failed to load students'
        );

        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    }

    loadStudents();
  }, [selectedSubject]);

  // =====================================================
  // SELECTED SUBJECT
  // =====================================================

  const currentSubject =
    subjects.find(
      (subject) =>
        String(subject.id) ===
        String(selectedSubject)
    );

  // =====================================================
  // CALCULATIONS
  // =====================================================

  const studentsWithAttendance =
    students.filter(
      (student) =>
        student.attendance !== undefined &&
        student.attendance !== null
    );

  const averageAttendance =
    studentsWithAttendance.length > 0
      ? Math.round(
          studentsWithAttendance.reduce(
            (sum, student) =>
              sum +
              Number(
                student.attendance || 0
              ),
            0
          ) /
            studentsWithAttendance.length
        )
      : 0;

  const studentsWithCT2 =
    students.filter(
      (student) =>
        student.ct2 !== undefined &&
        student.ct2 !== null
    );

  const averageCT2 =
    studentsWithCT2.length > 0
      ? Math.round(
          studentsWithCT2.reduce(
            (sum, student) =>
              sum +
              Number(
                student.ct2 || 0
              ),
            0
          ) /
            studentsWithCT2.length
        )
      : 0;

  const atRisk =
    students.filter(
      (student) =>
        student.trend === 'declining' ||
        Number(
          student.attendance || 0
        ) < 75
    );

  // =====================================================
  // LOADING SUBJECTS
  // =====================================================

  if (loadingSubjects) {
    return (
      <div>
        <div className="ledger-heading">
          <h2>Class overview</h2>
        </div>

        <hr className="ledger-rule" />

        <div className="panel">
          <p>Loading subjects...</p>
        </div>
      </div>
    );
  }

  // =====================================================
  // DASHBOARD
  // =====================================================

  return (
    <div>

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="ledger-heading">
        <h2>Class overview</h2>

        <span className="count">
          {currentSubject
            ? currentSubject.code || ''
            : 'Select a subject'}
        </span>
      </div>

      <hr className="ledger-rule" />

      {/* =================================================
          SUBJECT SELECTOR
      ================================================= */}

      <div className="panel">

        <div className="ledger-heading">
          <h2>Select Subject</h2>
        </div>

        <select
          value={selectedSubject}
          onChange={(e) =>
            setSelectedSubject(
              e.target.value
            )
          }
          style={{
            padding: '10px',
            minWidth: '300px',
            borderRadius: '4px',
            border:
              '1px solid var(--line)',
            background:
              'var(--panel)',
            color: 'var(--text)',
          }}
        >

          <option value="">
            Select a subject
          </option>

          {subjects.map((subject) => (
            <option
              key={subject.id}
              value={subject.id}
            >
              {subject.code
                ? `${subject.code} — ${subject.name}`
                : subject.name}
            </option>
          ))}

        </select>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="panel">
          <div className="error-text">
            {error}
          </div>
        </div>
      )}

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <div className="card-grid">

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
            Avg. attendance
          </div>

          <div className="stat-value">
            {averageAttendance}%
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-label">
            Avg. CT-2
          </div>

          <div className="stat-value">
            {averageCT2}%
          </div>

        </div>

        <div className="stat-card">

          <div className="stat-label">
            Flagged for support
          </div>

          <div className="stat-value">
            {atRisk.length}
          </div>

        </div>

      </div>

      {/* =================================================
          PENDING SUBJECT REQUESTS
      ================================================= */}

      <div className="panel">

        <div className="ledger-heading">

          <h2>
            Pending Subject Requests
          </h2>

          <span className="count">
            {subjectChoices.length} request
            {subjectChoices.length !== 1
              ? 's'
              : ''}
          </span>

        </div>

        {loadingChoices ? (

          <p>
            Loading subject requests...
          </p>

        ) : subjectChoices.length === 0 ? (

          <p>
            No pending subject requests.
          </p>

        ) : (

          <div
            style={{
              overflowX: 'auto',
            }}
          >

            <table className="ledger-table">

              <thead>

                <tr>

                  <th>
                    Student
                  </th>

                  <th>
                    ID
                  </th>

                  <th>
                    Open Elective
                  </th>

                  <th>
                    Liberal Learning
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>

              <tbody>

                {subjectChoices.map(
                  (choice) => {

                    const isProcessing =
                      processingChoice ===
                      choice.id;

                    return (
                      <tr
                        key={choice.id}
                      >

                        {/* STUDENT */}

                        <td>
                          <strong>
                            {
                              choice.student_name
                            }
                          </strong>
                        </td>

                        {/* STUDENT ID */}

                        <td>

                          <span className="code-stamp">
                            {
                              choice.student_code
                            }
                          </span>

                        </td>

                        {/* OPEN ELECTIVE */}

                        <td>

                          {
                            choice.open_elective ||
                            '-'
                          }

                          <br />

                          <small>
                            {
                              choice.open_elective_code ||
                              ''
                            }
                          </small>

                        </td>

                        {/* LLL */}

                        <td>

                          {
                            choice.liberal_learning ||
                            '-'
                          }

                          <br />

                          <small>
                            {
                              choice.liberal_learning_code ||
                              ''
                            }
                          </small>

                        </td>

                        {/* STATUS */}

                        <td>

                          <span className="pill pill-warn">
                            {
                              choice.status
                            }
                          </span>

                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div
                            style={{
                              display:
                                'flex',
                              gap: '8px',
                              flexWrap:
                                'wrap',
                            }}
                          >

                            <button
                              className="btn"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleApprove(
                                  choice.id
                                )
                              }
                            >
                              {isProcessing
                                ? 'Processing...'
                                : 'Approve'}
                            </button>

                            <button
                              className="btn btn-outline"
                              disabled={
                                isProcessing
                              }
                              onClick={() =>
                                handleReject(
                                  choice.id
                                )
                              }
                            >
                              {isProcessing
                                ? 'Processing...'
                                : 'Reject'}
                            </button>

                          </div>

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

      {/* =================================================
          LOADING STUDENTS
      ================================================= */}

      {loadingStudents && (
        <div className="panel">
          <p>
            Loading students...
          </p>
        </div>
      )}

      {/* =================================================
          AT RISK
      ================================================= */}

      {!loadingStudents &&
        atRisk.length > 0 && (

          <div className="panel">

            <div className="ledger-heading">

              <h2>
                Suggested faculty review
              </h2>

            </div>

            {atRisk.map(
              (student) => (

                <div
                  key={student.id}
                  style={{
                    padding:
                      '10px 0',
                    borderBottom:
                      '1px solid var(--line)',
                  }}
                >

                  <strong>
                    {
                      student.full_name ||
                      student.name ||
                      'Unknown Student'
                    }
                  </strong>

                  {' '}

                  (
                  {
                    student.student_code
                  }
                  )

                  {' — '}

                  attendance{' '}

                  {student.attendance !==
                  undefined
                    ? `${student.attendance}%`
                    : 'N/A'}

                  {student.ct2 !==
                    undefined && (
                    <>
                      , CT-2{' '}
                      {
                        student.ct2
                      }%
                    </>
                  )}

                  <span
                    className="pill pill-bad"
                    style={{
                      marginLeft: 8,
                    }}
                  >
                    Needs review
                  </span>

                </div>

              )
            )}

            <p
              style={{
                fontSize: 12,
                color:
                  'var(--muted-text)',
                marginTop: 10,
              }}
            >
              These are
              system-generated
              flags to support
              faculty judgment —
              not automated
              decisions about any
              student.
            </p>

          </div>
        )}

      {/* =================================================
          ALL STUDENTS
      ================================================= */}

      <div className="panel">

        <div className="ledger-heading">

          <h2>
            All students
          </h2>

        </div>

        {!selectedSubject ? (

          <p>
            Select a subject to view
            students.
          </p>

        ) : loadingStudents ? (

          <p>
            Loading students...
          </p>

        ) : students.length === 0 ? (

          <p>
            No students found for this
            subject.
          </p>

        ) : (

          <table className="ledger-table">

            <thead>

              <tr>

                <th>
                  Student
                </th>

                <th>
                  ID
                </th>

                <th>
                  Attendance
                </th>

                <th>
                  CT-2
                </th>

                <th>
                  Trend
                </th>

              </tr>

            </thead>

            <tbody>

              {students.map(
                (student) => {

                  const attendance =
                    student.attendance ??
                    0;

                  const ct2 =
                    student.ct2 ??
                    '-';

                  const trend =
                    student.trend ||
                    (Number(
                      attendance
                    ) < 75
                      ? 'declining'
                      : 'stable');

                  return (

                    <tr
                      key={
                        student.id
                      }
                    >

                      <td>
                        {
                          student.full_name ||
                          student.name ||
                          'Unknown Student'
                        }
                      </td>

                      <td>

                        <span className="code-stamp">
                          {
                            student.student_code
                          }
                        </span>

                      </td>

                      <td>
                        {attendance}%
                      </td>

                      <td>
                        {ct2}
                      </td>

                      <td>

                        <span
                          className={
                            `pill ${
                              trend ===
                              'improving'
                                ? 'pill-good'
                                : trend ===
                                  'declining'
                                ? 'pill-bad'
                                : 'pill-warn'
                            }`
                          }
                        >
                          {trend}
                        </span>

                      </td>

                    </tr>

                  );

                }
              )}

            </tbody>

          </table>

        )}

      </div>

      {/* =================================================
          QUICK ACTIONS
      ================================================= */}

      <div className="panel">

        <div className="ledger-heading">

          <h2>
            Quick actions
          </h2>

        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >

          <button
            className="btn"
            onClick={() =>
              navigate(
                '/faculty/attendance'
              )
            }
          >
            Mark attendance
          </button>

          <button
            className="btn btn-outline"
            onClick={() =>
              navigate(
                '/faculty/marks'
              )
            }
          >
            Enter CT marks
          </button>

          <button
            className="btn btn-outline"
            onClick={() =>
              navigate(
                '/faculty/materials'
              )
            }
          >
            Upload study material
          </button>

          <button
            className="btn btn-outline"
            onClick={() =>
              navigate(
                '/faculty/assignments'
              )
            }
          >
            Upload assignment
          </button>

        </div>

      </div>

    </div>
  );
}