import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const EXAM_TYPES = ['CT1', 'CT2', 'INTERNAL', 'EXTERNAL', 'END SEMESTER'];
const API_ORIGIN = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

const examLabel = (examType) => String(examType || '').trim().toUpperCase() || '-';

export default function Marksheet() {
  const [marks, setMarks] = useState([]);
  const [marksheets, setMarksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    async function loadMarks() {
      try {
        const [marksData, marksheetData] = await Promise.all([
          api.getMarks(),
          api.getMarksheet(),
        ]);
        setMarks(marksData || []);
        setMarksheets(marksheetData || []);
      } catch (err) {
        setError(err.message || 'Unable to load marks');
      } finally {
        setLoading(false);
      }
    }
    loadMarks();
  }, []);

  const normalizedMarks = useMemo(
    () => marks.map((mark) => ({ ...mark, exam_type: examLabel(mark.exam_type) })),
    [marks]
  );

  const subjectRows = useMemo(() => {
    const grouped = {};
    normalizedMarks.forEach((mark) => {
      const key = mark.code || mark.subject;
      if (!grouped[key]) grouped[key] = { subject: mark.subject, code: mark.code, marks: {} };
      grouped[key].marks[mark.exam_type] = mark;
    });
    return Object.values(grouped);
  }, [normalizedMarks]);

  const percentage = (mark) => {
    if (!mark || !Number(mark.max_marks)) return '-';
    return `${((Number(mark.obtained_marks) / Number(mark.max_marks)) * 100).toFixed(1)}%`;
  };

  async function downloadMarksheet(sheet) {
    if (!sheet.file_path) return;
    const url = `${API_ORIGIN}${sheet.file_path}`;
    try {
      setDownloading(sheet.id);
      const response = await fetch(url);
      if (!response.ok) throw new Error('Unable to download marksheet');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = sheet.file_name || `marksheet-semester-${sheet.semester_number}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (err) {
      setError(err.message || 'Unable to download marksheet');
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <div className="panel">Loading marks...</div>;
  if (error && !marks.length && !marksheets.length) return <div className="panel"><div className="error-text">{error}</div></div>;

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Marksheet & Marks</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>View published examination marks and official marksheets.</p>
        </div>
        <span className="count">Published</span>
      </div>
      <hr className="ledger-rule" />

      {error && <div className="panel"><div className="error-text">{error}</div></div>}

      <div className="panel">
        <div className="ledger-heading"><h2>Subject-wise Marks</h2><span className="count">{normalizedMarks.length} entries</span></div>
        {subjectRows.length === 0 ? <p>No published marks available.</p> : (
          <div className="table-wrapper">
            <table className="ledger-table">
              <thead><tr><th>Subject</th><th>Code</th>{EXAM_TYPES.map((type) => <th key={type}>{type}</th>)}</tr></thead>
              <tbody>
                {subjectRows.map((row) => (
                  <tr key={row.code || row.subject}>
                    <td>{row.subject}</td>
                    <td><span className="code-stamp">{row.code}</span></td>
                    {EXAM_TYPES.map((type) => {
                      const mark = row.marks[type];
                      return <td key={type}>{mark ? <div><strong>{mark.obtained_marks}/{mark.max_marks}</strong><br /><small>{mark.grade || '-'} · {percentage(mark)}</small></div> : '-'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {EXAM_TYPES.map((examType) => {
        const examMarks = normalizedMarks.filter((mark) => mark.exam_type === examType);
        return (
          <div className="panel" key={examType}>
            <div className="ledger-heading"><h2>{examType} Marks</h2><span className="count">{examMarks.length} subjects</span></div>
            {examMarks.length === 0 ? <p>No published {examType} marks available.</p> : (
              <div className="table-wrapper">
                <table className="ledger-table">
                  <thead><tr><th>Subject</th><th>Code</th><th>Marks</th><th>Percentage</th><th>Grade</th></tr></thead>
                  <tbody>{examMarks.map((mark, index) => <tr key={`${examType}-${mark.code}-${index}`}><td>{mark.subject}</td><td><span className="code-stamp">{mark.code}</span></td><td>{mark.obtained_marks}/{mark.max_marks}</td><td>{percentage(mark)}</td><td>{mark.grade || '-'}</td></tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <div className="panel">
        <div className="ledger-heading">
          <div>
            <h2>Published Marksheets</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>Official PDF marksheets uploaded and published by faculty.</p>
          </div>
          <span className="count">{marksheets.length} document{marksheets.length === 1 ? '' : 's'}</span>
        </div>

        {marksheets.length === 0 ? <p>No published marksheet available yet.</p> : (
          <div className="table-wrapper">
            <table className="ledger-table">
              <thead><tr><th>Semester</th><th>SGPA</th><th>CGPA</th><th>Result</th><th>Published</th><th>Document</th></tr></thead>
              <tbody>
                {marksheets.map((sheet, index) => {
                  const url = `${API_ORIGIN}${sheet.file_path}`;
                  return (
                    <tr key={sheet.id || index}>
                      <td>Semester {sheet.semester_number}</td>
                      <td>{sheet.sgpa ?? '-'}</td>
                      <td>{sheet.cgpa ?? '-'}</td>
                      <td>{sheet.result_status || '-'}</td>
                      <td><span className="pill pill-good">Published</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <a className="btn btn-outline" href={url} target="_blank" rel="noreferrer">View PDF</a>
                          <button className="btn" onClick={() => downloadMarksheet(sheet)} disabled={downloading === sheet.id}>
                            {downloading === sheet.id ? 'Downloading...' : 'Download'}
                          </button>
                        </div>
                        <small style={{ display: 'block', marginTop: 6, color: 'var(--muted-text)' }}>{sheet.file_name}</small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
