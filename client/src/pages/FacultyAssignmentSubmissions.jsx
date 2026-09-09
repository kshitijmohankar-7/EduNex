import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { api } from '../services/api';

export default function FacultyAssignmentSubmissions() {

  const { assignmentId } = useParams();

  const navigate = useNavigate();

  const [submissions, setSubmissions] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [processing, setProcessing] =
    useState(null);


  // ======================================================
  // LOAD SUBMISSIONS
  // ======================================================

  async function loadSubmissions() {

    try {

      setLoading(true);
      setError('');

      const data =
        await api.getAssignmentSubmissions(
          assignmentId
        );

      setSubmissions(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (err) {

      console.error(err);

      setError(
        err.message ||
        'Failed to load submissions'
      );

    } finally {

      setLoading(false);

    }
  }


  useEffect(() => {

    if (assignmentId) {
      loadSubmissions();
    }

  }, [assignmentId]);


  // ======================================================
  // FORMAT DATE
  // ======================================================

  function formatDate(date) {

    if (!date) {
      return '-';
    }

    return new Date(date).toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }


  // ======================================================
  // OPEN STUDENT SUBMISSION
  // ======================================================

  function openSubmission(filePath) {

    if (!filePath) {

      alert(
        'Submission file is not available.'
      );

      return;
    }

    let normalizedPath =
      filePath.replace(/\\/g, '/');


    // Find /uploads/
    const uploadsIndex =
      normalizedPath.indexOf('/uploads/');


    if (uploadsIndex !== -1) {

      normalizedPath =
        normalizedPath.substring(
          uploadsIndex
        );

    } else {

      // fallback
      normalizedPath =
        `/uploads/assignments/${normalizedPath
          .split('/')
          .pop()}`;

    }


    const baseUrl =
      import.meta.env.VITE_API_BASE_URL ||
      'http://localhost:5000/api';


    const serverUrl =
      baseUrl.replace(
        /\/api\/?$/,
        ''
      );


    window.open(
      `${serverUrl}${normalizedPath}`,
      '_blank'
    );
  }


  // ======================================================
  // APPROVE
  // ======================================================

  async function handleApprove(
    submissionId
  ) {

    const confirmed =
      window.confirm(
        'Approve this assignment submission?'
      );

    if (!confirmed) {
      return;
    }


    try {

      setProcessing(
        submissionId
      );


      await api.approveAssignmentSubmission(
        submissionId
      );


      await loadSubmissions();


    } catch (err) {

      console.error(err);

      alert(
        err.message ||
        'Failed to approve submission'
      );

    } finally {

      setProcessing(null);

    }
  }


  // ======================================================
  // REJECT
  // ======================================================

  async function handleReject(
    submissionId
  ) {

    const confirmed =
      window.confirm(
        'Reject this assignment submission?'
      );

    if (!confirmed) {
      return;
    }


    try {

      setProcessing(
        submissionId
      );


      await api.rejectAssignmentSubmission(
        submissionId
      );


      await loadSubmissions();


    } catch (err) {

      console.error(err);

      alert(
        err.message ||
        'Failed to reject submission'
      );

    } finally {

      setProcessing(null);

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
            Assignment submissions
          </h2>

        </div>

        <hr className="ledger-rule" />

        <div className="panel">

          <p>
            Loading submissions...
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
            Assignment submissions
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
  // PAGE
  // ======================================================

  return (

    <div>

      <div className="ledger-heading">

        <h2>
          Assignment submissions
        </h2>

        <span className="count">

          {submissions.length}
          {' '}
          submission
          {submissions.length !== 1
            ? 's'
            : ''}

        </span>

      </div>

      <hr className="ledger-rule" />


      <div className="panel">

        {submissions.length === 0 ? (

          <p>
            No students have submitted
            this assignment yet.
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
                  Submitted
                </th>

                <th>
                  File
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

              {submissions.map(
                (submission) => (

                  <tr
                    key={submission.id}
                  >

                    {/* STUDENT */}

                    <td>

                      <strong>

                        {
                          submission.student_name
                        }

                      </strong>

                    </td>


                    {/* ID */}

                    <td>

                      <span className="code-stamp">

                        {
                          submission.student_code
                        }

                      </span>

                    </td>


                    {/* DATE */}

                    <td>

                      {
                        formatDate(
                          submission.submitted_at
                        )
                      }

                    </td>


                    {/* FILE */}

                    <td>

                      <button
                        className="btn btn-outline"
                        onClick={() =>
                          openSubmission(
                            submission.file_path
                          )
                        }
                      >

                        Open

                      </button>

                    </td>


                    {/* STATUS */}

                    <td>

                      {submission.status ===
                        'pending' && (

                        <span className="pill pill-warn">

                          Pending

                        </span>

                      )}


                      {submission.status ===
                        'submitted' && (

                        <span className="pill pill-good">

                          ✓ Submitted

                        </span>

                      )}


                      {submission.status ===
                        'rejected' && (

                        <span className="pill pill-bad">

                          Rejected

                        </span>

                      )}

                    </td>


                    {/* ACTION */}

                    <td>

                      {submission.status ===
                        'pending' ? (

                        <div
                          style={{
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap'
                          }}
                        >

                          <button
                            className="btn"
                            disabled={
                              processing ===
                              submission.id
                            }
                            onClick={() =>
                              handleApprove(
                                submission.id
                              )
                            }
                          >

                            {processing ===
                            submission.id
                              ? 'Processing...'
                              : 'Approve'}

                          </button>


                          <button
                            className="btn btn-outline"
                            disabled={
                              processing ===
                              submission.id
                            }
                            onClick={() =>
                              handleReject(
                                submission.id
                              )
                            }
                          >

                            Reject

                          </button>

                        </div>

                      ) : (

                        <span
                          style={{
                            color:
                              'var(--muted-text)',
                            fontSize: 12
                          }}
                        >

                          Already processed

                        </span>

                      )}

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        )}

      </div>


      {/* BACK BUTTON */}

      <div className="panel">

        <button
          className="btn btn-outline"
          onClick={() =>
            navigate('/faculty/assignments')
          }
        >

          ← Back to assignments

        </button>

      </div>

    </div>

  );
}