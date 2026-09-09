import { useEffect, useState } from 'react';
import { api } from '../services/api';

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

  if (loading) {
    return (
      <div className="panel">
        Loading marks...
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  // Group marks by subject
  const subjects = {};

  marks.forEach((mark) => {
    if (!subjects[mark.code]) {
      subjects[mark.code] = {
        subject: mark.subject,
        code: mark.code,
        ct1: null,
        ct2: null,
      };
    }

    const exam = mark.exam_type?.toLowerCase();

    if (exam === 'ct1') {
      subjects[mark.code].ct1 = mark;
    }

    if (exam === 'ct2') {
      subjects[mark.code].ct2 = mark;
    }
  });

  const subjectRows = Object.values(subjects);

  function percentage(mark) {
    if (!mark || !mark.max_marks) return '-';

    return `${(
      (Number(mark.obtained_marks) /
        Number(mark.max_marks)) *
      100
    ).toFixed(1)}%`;
  }

  return (
    <div>
      <div className="ledger-heading">
        <h2>Marksheet & Marks</h2>

        <span className="count">
          Published Marks
        </span>
      </div>

      <hr className="ledger-rule" />

      {/* Marks */}
      <div className="panel">
        <div className="ledger-heading">
          <h2>Internal Assessment</h2>
        </div>

        {subjectRows.length === 0 ? (
          <p>No published marks available.</p>
        ) : (
          <table className="ledger-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Code</th>
                <th>CT-1</th>
                <th>CT-2</th>
                <th>Average</th>
              </tr>
            </thead>

            <tbody>
              {subjectRows.map((row) => {
                const ct1 = row.ct1
                  ? Number(row.ct1.obtained_marks)
                  : null;

                const ct2 = row.ct2
                  ? Number(row.ct2.obtained_marks)
                  : null;

                const values = [ct1, ct2].filter(
                  (value) => value !== null
                );

                const average =
                  values.length > 0
                    ? (
                        values.reduce(
                          (sum, value) => sum + value,
                          0
                        ) / values.length
                      ).toFixed(1)
                    : '-';

                return (
                  <tr key={row.code}>
                    <td>{row.subject}</td>

                    <td>
                      <span className="code-stamp">
                        {row.code}
                      </span>
                    </td>

                    <td>
                      {row.ct1
                        ? `${row.ct1.obtained_marks}/${row.ct1.max_marks}`
                        : '-'}
                    </td>

                    <td>
                      {row.ct2
                        ? `${row.ct2.obtained_marks}/${row.ct2.max_marks}`
                        : '-'}
                    </td>

                    <td>
                      {average === '-'
                        ? '-'
                        : `${average}%`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

{/* Detailed Marks */}

<div className="panel">
  <div className="ledger-heading">
    <h2>CT-1 Marks</h2>
  </div>

  {marks.filter((mark) => mark.exam_type === 'ct1').length === 0 ? (
    <p>No CT-1 marks available.</p>
  ) : (
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
        {marks
          .filter((mark) => mark.exam_type === 'ct1')
          .map((mark, index) => (
            <tr key={`ct1-${mark.code}-${index}`}>
              <td>{mark.subject}</td>

              <td>
                <span className="code-stamp">
                  {mark.code}
                </span>
              </td>

              <td>
                {mark.obtained_marks}/{mark.max_marks}
              </td>

              <td>
                {percentage(mark)}
              </td>

              <td>
                {mark.grade || '-'}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  )}
</div>

<div className="panel">
  <div className="ledger-heading">
    <h2>CT-2 Marks</h2>
  </div>

  {marks.filter((mark) => mark.exam_type === 'ct2').length === 0 ? (
    <p>No CT-2 marks available.</p>
  ) : (
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
        {marks
          .filter((mark) => mark.exam_type === 'ct2')
          .map((mark, index) => (
            <tr key={`ct2-${mark.code}-${index}`}>
              <td>{mark.subject}</td>

              <td>
                <span className="code-stamp">
                  {mark.code}
                </span>
              </td>

              <td>
                {mark.obtained_marks}/{mark.max_marks}
              </td>

              <td>
                {percentage(mark)}
              </td>

              <td>
                {mark.grade || '-'}
              </td>
            </tr>
          ))}
      </tbody>
    </table>
  )}
</div>

      {/* Published Marksheet */}
      <div className="panel">
        <div className="ledger-heading">
          <h2>Published Marksheets</h2>
        </div>

        {marksheets.length === 0 ? (
          <p>
            No published marksheet available yet.
          </p>
        ) : (
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
                  <td>
                    Semester {sheet.semester_number}
                  </td>

                  <td>
                    {sheet.sgpa ?? '-'}
                  </td>

                  <td>
                    {sheet.cgpa ?? '-'}
                  </td>

                  <td>
                    <span className="pill pill-good">
                      Published
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}