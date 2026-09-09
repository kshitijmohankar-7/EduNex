import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../services/api';

function colorFor(pct) {
  if (pct >= 85) return '#3F5B4E';
  if (pct >= 75) return '#B08D57';
  return '#7A3B3B';
}

export default function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [overall, setOverall] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadAttendance() {
      try {
        const data = await api.getAttendance();

        setAttendance(data.bySubject || []);
        setOverall(data.overallPercentage || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAttendance();
  }, []);

  if (loading) {
    return <div className="panel">Loading attendance...</div>;
  }

  if (error) {
    return (
      <div className="panel">
        <div className="error-text">{error}</div>
      </div>
    );
  }

  const chartData = attendance.map((item) => ({
    code: item.code,
    percentage: item.percentage,
  }));

  return (
    <div>
      <div className="ledger-heading">
        <h2>Attendance</h2>
        <span className="count">
          Overall: {overall}%
        </span>
      </div>

      <hr className="ledger-rule" />

      {/* Chart */}
      <div className="panel">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ left: -10 }}>
            <CartesianGrid
              stroke="rgba(28,27,24,0.08)"
              vertical={false}
            />

            <XAxis
              dataKey="code"
              tick={{ fontSize: 11 }}
              stroke="#6B6558"
            />

            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              stroke="#6B6558"
            />

            <Tooltip />

            <Bar
              dataKey="percentage"
              radius={[3, 3, 0, 0]}
              fill="#B08D57"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Attendance table */}
      <div className="panel">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Code</th>
              <th>Present</th>
              <th>Total</th>
              <th>Percentage</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {attendance.length === 0 ? (
              <tr>
                <td colSpan="6">
                  No attendance records available.
                </td>
              </tr>
            ) : (
              attendance.map((a) => (
                <tr key={a.code}>
                  <td>{a.subject}</td>

                  <td>
                    <span className="code-stamp">
                      {a.code}
                    </span>
                  </td>

                  <td>{a.presentCount}</td>

                  <td>{a.totalCount}</td>

                  <td>
                    <strong
                      style={{
                        color: colorFor(a.percentage),
                      }}
                    >
                      {a.percentage}%
                    </strong>
                  </td>

                  <td>
                    <span
                      className={`pill ${
                        a.percentage >= 85
                          ? 'pill-good'
                          : a.percentage >= 75
                          ? 'pill-warn'
                          : 'pill-bad'
                      }`}
                    >
                      {a.percentage >= 75
                        ? 'On track'
                        : 'Below requirement'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}