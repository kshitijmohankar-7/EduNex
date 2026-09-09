import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function FacultyMaterials() {
  const [subjects, setSubjects] = useState([]);

  const [form, setForm] = useState({
    subjectId: '',
    title: '',
    unit: '',
  });

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSubjects() {
      try {
        const data = await api.getSubjects();
        setSubjects(data);
      } catch (err) {
        setError(err.message);
      }
    }

    loadSubjects();
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const allowedExtensions = ['.pdf', '.doc', '.docx'];

    const extension = selectedFile.name
      .substring(selectedFile.name.lastIndexOf('.'))
      .toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setError('Only PDF, DOC and DOCX files are allowed.');
      e.target.value = '';
      setFile(null);
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10 MB.');
      e.target.value = '';
      setFile(null);
      return;
    }

    setError('');
    setFile(selectedFile);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!form.subjectId) {
      setError('Please select a subject.');
      return;
    }

    if (!form.title.trim()) {
      setError('Please enter a study material title.');
      return;
    }

    if (!form.unit.trim()) {
      setError('Please enter the unit.');
      return;
    }

    if (!file) {
      setError('Please select a study material file.');
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      formData.append('subjectId', form.subjectId);
      formData.append('title', form.title);
      formData.append('unit', form.unit);
      formData.append('file', file);

      await api.createMaterial(formData);

      setMessage('Study material uploaded successfully.');

      setForm({
        subjectId: '',
        title: '',
        unit: '',
      });

      setFile(null);

      document.getElementById('material-file').value = '';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="ledger-heading">
        <h2>Upload Study Material</h2>
        <span className="count">Faculty</span>
      </div>

      <hr className="ledger-rule" />

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
                  {subject.code} - {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="title">
              Material Title
            </label>

            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              placeholder="Example: Unit 1 Introduction"
            />
          </div>

          <div className="field">
            <label htmlFor="unit">
              Unit
            </label>

            <input
              id="unit"
              name="unit"
              type="text"
              value={form.unit}
              onChange={handleChange}
              placeholder="Example: Unit 1"
            />
          </div>

          <div className="field">
            <label htmlFor="material-file">
              Study Material File
            </label>

            <input
              id="material-file"
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
            />

            <small>
              Accepted formats: PDF, DOC, DOCX · Maximum size: 10 MB
            </small>

            {file && (
              <div style={{ marginTop: 8 }}>
                Selected: <strong>{file.name}</strong>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'Upload Study Material'}
          </button>

        </form>
      </div>
    </div>
  );
}