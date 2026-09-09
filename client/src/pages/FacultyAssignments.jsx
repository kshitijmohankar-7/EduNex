import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export default function FacultyAssignments() {
  const navigate = useNavigate();

  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [form, setForm] = useState({
    subjectId: '',
    title: '',
    description: '',
    deadline: '',
  });

  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // ======================================================
  // LOAD SUBJECTS
  // ======================================================

  useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await api.getSubjects();
        setSubjects(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Failed to load subjects');
      }
    }

    loadSubjects();
  }, []);

  // ======================================================
  // LOAD ASSIGNMENTS
  // ======================================================

  async function loadAssignments() {
    try {
      setLoadingAssignments(true);

      /*
       * This expects api.getFacultyAssignments()
       * to return assignments uploaded by the logged-in faculty.
       */
      const data = await api.getFacultyAssignments();

      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);

      // Don't overwrite upload errors
      if (!assignments.length) {
        setError(err.message || 'Failed to load assignments');
      }
    } finally {
      setLoadingAssignments(false);
    }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  // ======================================================
  // FORM CHANGE
  // ======================================================

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  // ======================================================
  // FILE CHANGE
  // ======================================================

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedExtensions = [
      '.pdf',
      '.doc',
      '.docx',
    ];

    const extension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf('.'))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError(
        'Only PDF, DOC and DOCX files are allowed.'
      );

      e.target.value = '';
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError(
        'File size must be less than 10 MB.'
      );

      e.target.value = '';
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  }

  // ======================================================
  // UPLOAD ASSIGNMENT
  // ======================================================

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!form.subjectId) {
      setError('Please select a subject.');
      return;
    }

    if (!form.title.trim()) {
      setError('Please enter an assignment title.');
      return;
    }

    if (!form.deadline) {
      setError('Please select a deadline.');
      return;
    }

    if (!file) {
      setError('Please select an assignment file.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append(
        'subjectId',
        form.subjectId
      );

      formData.append(
        'title',
        form.title
      );

      formData.append(
        'description',
        form.description
      );

      formData.append(
        'deadline',
        form.deadline
      );

      formData.append(
        'file',
        file
      );

      await api.createAssignment(formData);

      setMessage(
        'Assignment uploaded successfully.'
      );

      // Reset form
      setForm({
        subjectId: '',
        title: '',
        description: '',
        deadline: '',
      });

      setFile(null);

      const fileInput =
        document.getElementById(
          'assignment-file'
        );

      if (fileInput) {
        fileInput.value = '';
      }

      // Refresh assignment list
      await loadAssignments();

    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          'Failed to upload assignment.'
      );
    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // DATE FORMAT
  // ======================================================

  function formatDate(date) {
    if (!date) return '-';

    return new Date(date).toLocaleString(
      'en-IN',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  }

  // ======================================================
  // CHECK DEADLINE
  // ======================================================

  function isExpired(deadline) {
    if (!deadline) return false;

    return new Date(deadline) < new Date();
  }

  // ======================================================
  // OPEN SUBMISSIONS
  // ======================================================

  function viewSubmissions(assignmentId) {
    navigate(
      `/faculty/assignments/${assignmentId}/submissions`
    );
  }

  // ======================================================
  // PAGE
  // ======================================================

  return (
    <div>

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="ledger-heading">

        <h2>Upload Assignment</h2>

        <span className="count">
          Faculty
        </span>

      </div>

      <hr className="ledger-rule" />


      {/* ==================================================
          UPLOAD FORM
      ================================================== */}

      <div className="panel">

        <form onSubmit={handleSubmit}>

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

            <label htmlFor="subjectId">
              Subject
            </label>

            <select
              id="subjectId"
              name="subjectId"
              value={form.subjectId}
              onChange={handleChange}
            >

              <option value="">
                Select subject
              </option>

              {subjects.map((subject) => (
                <option
                  key={subject.id}
                  value={subject.id}
                >
                  {subject.code
                    ? `${subject.code} - ${subject.name}`
                    : subject.name}
                </option>
              ))}

            </select>

          </div>


          {/* TITLE */}

          <div className="field">

            <label htmlFor="title">
              Assignment Title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Example: Unit 1 Assignment"
            />

          </div>


          {/* DESCRIPTION */}

          <div className="field">

            <label htmlFor="description">
              Description / Instructions
            </label>

            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Enter assignment instructions"
              rows="5"
            />

          </div>


          {/* DEADLINE */}

          <div className="field">

            <label htmlFor="deadline">
              Deadline
            </label>

            <input
              id="deadline"
              name="deadline"
              type="datetime-local"
              value={form.deadline}
              onChange={handleChange}
            />

          </div>


          {/* FILE */}

          <div className="field">

            <label htmlFor="assignment-file">
              Assignment File
            </label>

            <input
              id="assignment-file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />

            <small>
              Accepted formats: PDF, DOC, DOCX ·
              Maximum size: 10 MB
            </small>

            {file && (
              <div style={{ marginTop: 8 }}>
                Selected:{' '}
                <strong>
                  {file.name}
                </strong>
              </div>
            )}

          </div>


          {/* UPLOAD BUTTON */}

          <button
            type="submit"
            className="btn"
            disabled={loading}
          >
            {loading
              ? 'Uploading...'
              : 'Upload Assignment'}
          </button>

        </form>

      </div>


      {/* ==================================================
          ASSIGNMENTS
      ================================================== */}

      <div className="panel">

        <div className="ledger-heading">

          <h2>
            Uploaded Assignments
          </h2>

          <span className="count">
            {assignments.length} assignment
            {assignments.length !== 1
              ? 's'
              : ''}
          </span>

        </div>


        {loadingAssignments ? (

          <p>
            Loading assignments...
          </p>

        ) : assignments.length === 0 ? (

          <p>
            No assignments uploaded yet.
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
                  Status
                </th>

                <th>
                  Submissions
                </th>

              </tr>

            </thead>


            <tbody>

              {assignments.map(
                (assignment) => (

                  <tr
                    key={assignment.id}
                  >

                    {/* SUBJECT */}

                    <td>

                      <span className="code-stamp">
                        {assignment.code || '-'}
                      </span>

                      <div
                        style={{
                          marginTop: 5,
                        }}
                      >
                        {assignment.subject ||
                          assignment.subject_name ||
                          '-'}
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
                            marginTop: 5,
                          }}
                        >
                          {assignment.description}
                        </div>
                      )}

                    </td>


                    {/* DEADLINE */}

                    <td>

                      <span
                        className={
                          `pill ${
                            isExpired(
                              assignment.deadline
                            )
                              ? 'pill-bad'
                              : 'pill-warn'
                          }`
                        }
                      >
                        {formatDate(
                          assignment.deadline
                        )}
                      </span>

                    </td>


                    {/* STATUS */}

                    <td>

                      {isExpired(
                        assignment.deadline
                      ) ? (

                        <span className="pill pill-bad">
                          Closed
                        </span>

                      ) : (

                        <span className="pill pill-good">
                          Active
                        </span>

                      )}

                    </td>


                    {/* SUBMISSIONS */}

                    <td>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() =>
                          viewSubmissions(
                            assignment.id
                          )
                        }
                      >
                        View Submissions
                      </button>

                    </td>

                  </tr>

                )
              )}

            </tbody>

          </table>

        )}

      </div>

    </div>
  );
}