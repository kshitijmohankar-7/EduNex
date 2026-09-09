import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const EXAM_TYPES = [
  'CT1',
  'CT2',
  'INTERNAL',
  'EXTERNAL',
  'END SEMESTER',
];

const examLabel = (examType) => {
  const normalized = String(examType || '').trim().toUpperCase();
  return normalized || '-';
};

export default function Marksheet() {
  const [marks, setMarks] = useState([]);
  const [marksheets, setMarksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    () =>
      marks.map((mark) => ({
        ...mark,
        exam_type: examLabel(mark.exam_type),
      })),
    [marks]
  );

  const subjectRows = useMemo(() => {
    const grouped = {};

    normalizedMarks.forEach((mark) => {
      const key = mark.code || mark.subject;

      if (!grouped[key]) {
        grouped[key] = {
          subject: mark.subject,
          code: mark.code,
          marks: {},
        };
      }

      grouped[key].marks[mark.exam_type] = mark;
    });

    return Object.values(grouped);
  }, [normalizedMarks]);

  const percentage = (mark) => {
    if (!mark || !Number(mark.max_marks)) return '-';

    return `${(
      (Number(mark.obtained_marks) / Number(mark.max_marks)) * 100
    ).toFixed(1)}%`;
  };

  if (loading) {
    return <div className="panel">Loading marks...</div>;
  }

  if (error) {
    return (
      <div className="panel">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="ledger-heading">
        <h2>Marksheet & Marks</h2>
        <span className="count">Published Marks</span>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">
        <div className="ledger-heading">
          <h2>Subject-wise Marks</h2>
          <span className="count">{normalizedMarks.length} published entries</span>
        </div>

        {subjectRows.length === 0 ? (
          <p>No published marks available.</p>
        ) : (
          <div className="table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Code</th>
                  {EXAM_TYPES.map((type) => (
                    <th key={type}>{type}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {subjectRows.map((row) => (
                  <tr key={row.code || row.subject}>
                    <td>{row.subject}</td>
                    <td>
                      <span className="code-stamp">{row.code}</span>
                    </td>

                    {EXAM_TYPES.map((type) => {
                      const mark = row.marks[type];

                      return (
                        <td key={type}>
                          {mark ? (
                            <div>
                              <strong>
                                {mark.obtained_marks}/{mark.max_marks}
                              </strong>
                              <br />
                              <small>{mark.grade || '-'} · {percentage(mark)}</small>
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {EXAM_TYPES.map((examType) => {
        const examMarks = normalizedMarks.filter(
          (mark) => mark.exam_type === examType
        );

        return (
          <div className="panel" key={examType}>
            <div className="ledger-heading">
              <h2>{examType} Marks</h2>
              <span className="count">{examMarks.length} subjects</span>
            </div>

            {examMarks.length === 0 ? (
              <p>No published {examType} marks available.</p>
            ) : (
              <div className="table-wrapper">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Code</th>
                      <th>Marks</th>
                      <th>Percentage</th>
                      <th>Grade</th>
                    </tr>
                  </thead>

                  <tbody>
                    {examMarks.map((mark, index) => (
                      <tr key={`${examType}-${mark.code}-${index}`}>
                        <td>{mark.subject}</td>
                        <td>
                          <span className="code-stamp">{mark.code}</span>
                        </td>
                        <td>
                          {mark.obtained_marks}/{mark.max_marks}
                        </td>
                        <td>{percentage(mark)}</td>
                        <td>{mark.grade || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      <div className="panel">
        <div className="ledger-heading">
          <h2>Published Marksheets</h2>
        </div>

        {marksheets.length === 0 ? (
          <p>No published marksheet available yet.</p>
        ) : (
          <div className="table-wrapper">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Semester</th>
                  <th>SGPA</th>
                  <th>CGPA</th>
                  <th>Published</th>
                </tr>
              </thead>

              <tbody>
                {marksheets.map((sheet, index) => (
                  <tr key={sheet.id || index}>
                    <td>Semester {sheet.semester_number}</td>
                    <td>{sheet.sgpa ?? '-'}</td>
                    <td>{sheet.cgpa ?? '-'}</td>
                    <td>
                      <span className="pill pill-good">Published</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}