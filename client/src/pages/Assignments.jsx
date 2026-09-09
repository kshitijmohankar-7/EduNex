import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Assignments() {

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(null);

  useEffect(() => {

    async function loadAssignments() {

      try {

        setLoading(true);
        setError('');

        const data = await api.getAssignments();

        setAssignments(
          Array.isArray(data) ? data : []
        );

      } catch (err) {

        console.error(err);

        setError(
          err.message || 'Failed to load assignments'
        );

      } finally {

        setLoading(false);

      }
    }

    loadAssignments();

  }, []);


  // ======================================================
  // DATE
  // ======================================================

  function formatDate(date) {

    if (!date) return '-';

    return new Date(date).toLocaleDateString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }
    );
  }


  // ======================================================
  // OPEN FACULTY ASSIGNMENT
  // ======================================================

  function openAssignment(filePath) {

    if (!filePath) {

      alert(
        'Assignment file is not available.'
      );

      return;
    }

    let normalizedPath =
      filePath.replace(/\\/g, '/');

    const uploadsIndex =
      normalizedPath.indexOf('/uploads/');

    if (uploadsIndex !== -1) {

      normalizedPath =
        normalizedPath.substring(
          uploadsIndex
        );

    }

    if (
      !normalizedPath.startsWith('/uploads/')
    ) {

      normalizedPath =
        `/uploads/assignments/${normalizedPath
          .split('/')
          .pop()}`;

    }

    const baseUrl =
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:5000/api';

    const serverUrl =
      baseUrl.replace(/\/api\/?$/, '');

    window.open(
      `${serverUrl}${normalizedPath}`,
      '_blank'
    );
  }


  // ======================================================
  // SUBMIT ASSIGNMENT
  // ======================================================

  async function handleSubmit(
    assignmentId,
    file
  ) {

    if (!file) {

      alert(
        'Please select a PDF, DOC or DOCX file.'
      );

      return;
    }

    try {

      setUploading(assignmentId);

      const formData =
        new FormData();

      formData.append(
        'file',
        file
      );

      await api.submitAssignment(
        assignmentId,
        formData
      );

      // Refresh assignments
      const data =
        await api.getAssignments();

      setAssignments(
        Array.isArray(data)
          ? data
          : []
      );

      alert(
        'Assignment uploaded successfully. Waiting for faculty approval.'
      );

    } catch (err) {

      console.error(err);

      alert(
        err.message ||
        'Failed to submit assignment'
      );

    } finally {

      setUploading(null);

    }
  }


  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {

    return (

      <div>

        <div className="ledger-heading">

          <h2>
            Assignments
          </h2>

        </div>

        <hr className="ledger-rule" />

        <div className="panel">

          <p>
            Loading assignments...
          </p>

        </div>

      </div>

    );
  }


  // ======================================================
  // ERROR
  // ======================================================

  if (error) {

    return (

      <div>

        <div className="ledger-heading">

          <h2>
            Assignments
          </h2>

        </div>

        <hr className="ledger-rule" />

        <div className="panel">

          <div className="error-text">
            {error}
          </div>

        </div>

      </div>

    );
  }


  // ======================================================
  // UI
  // ======================================================

  return (

    <div>

      <div className="ledger-heading">

        <h2>
          Assignments
        </h2>

        <span className="count">

          {assignments.length}
          {' '}
          assignment
          {assignments.length !== 1
            ? 's'
            : ''}

        </span>

      </div>

      <hr className="ledger-rule" />


      <div className="panel">

        {assignments.length === 0 ? (

          <p>
            No assignments available.
          </p>

        ) : (

          <table className="ledger-table">

            <thead>

              <tr>

                <th>
                  Subject
                </th>

                <th>
                  Assignment
                </th>

                <th>
                  Deadline
                </th>

                <th>
                  Faculty File
                </th>

                <th>
                  Submission
                </th>

              </tr>

            </thead>


            <tbody>

              {assignments.map(
                (assignment) => {

                  const status =
                    assignment.submission_status ||
                    'not_submitted';


                  return (

                    <tr
                      key={assignment.id}
                    >

                      {/* SUBJECT */}

                      <td>

                        <span className="code-stamp">

                          {assignment.code}

                        </span>

                        <div
                          style={{
                            marginTop: 5
                          }}
                        >

                          {assignment.subject}

                        </div>

                      </td>


                      {/* ASSIGNMENT */}

                      <td>

                        <strong>

                          {assignment.title}

                        </strong>

                        {assignment.description && (

                          <div
                            style={{
                              fontSize: 12,
                              color:
                                'var(--muted-text)',
                              marginTop: 5
                            }}
                          >

                            {
                              assignment.description
                            }

                          </div>

                        )}

                      </td>


                      {/* DEADLINE */}

                      <td>

                        <span
                          className="pill pill-warn"
                        >

                          {formatDate(
                            assignment.deadline
                          )}

                        </span>

                      </td>


                      {/* FACULTY FILE */}

                      <td>

                        <button
                          className="btn btn-outline"
                          onClick={() =>
                            openAssignment(
                              assignment.file_path
                            )
                          }
                        >

                          Open

                        </button>

                      </td>


                      {/* SUBMISSION */}

                      <td>

                        {status ===
                          'not_submitted' && (

                          <div>

                            <input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              id={`file-${assignment.id}`}
                            />

                            <button
                              className="btn"
                              style={{
                                marginTop: 8
                              }}
                              disabled={
                                uploading ===
                                assignment.id
                              }
                              onClick={() => {

                                const input =
                                  document.getElementById(
                                    `file-${assignment.id}`
                                  );

                                handleSubmit(
                                  assignment.id,
                                  input.files[0]
                                );

                              }}
                            >

                              {uploading ===
                              assignment.id
                                ? 'Uploading...'
                                : 'Upload'}

                            </button>

                          </div>

                        )}


                        {status ===
                          'pending' && (

                          <span
                            className="pill pill-warn"
                          >

                            Pending Approval

                          </span>

                        )}


                        {status ===
                          'submitted' && (

                          <span
                            className="pill pill-good"
                          >

                            ✓ Submitted

                          </span>

                        )}


                        {status ===
                          'rejected' && (

                          <div>

                            <span
                              className="pill pill-bad"
                            >

                              Rejected

                            </span>

                            <div
                              style={{
                                marginTop: 8
                              }}
                            >

                              <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                id={`file-${assignment.id}`}
                              />

                              <button
                                className="btn"
                                style={{
                                  marginTop: 8
                                }}
                                onClick={() => {

                                  const input =
                                    document.getElementById(
                                      `file-${assignment.id}`
                                    );

                                  handleSubmit(
                                    assignment.id,
                                    input.files[0]
                                  );

                                }}
                              >

                                Resubmit

                              </button>

                            </div>

                          </div>

                        )}

                      </td>

                    </tr>

                  );

                }
              )}

            </tbody>

          </table>

        )}

      </div>

    </div>

  );
}