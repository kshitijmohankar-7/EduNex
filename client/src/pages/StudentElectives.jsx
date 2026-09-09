import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function StudentElectives() {
  const [openElectives, setOpenElectives] = useState([]);
  const [liberalLearning, setLiberalLearning] = useState([]);

  const [openChoice, setOpenChoice] = useState('');
  const [lllChoice, setLllChoice] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadElectives();
  }, []);

  async function loadElectives() {
    try {
      setLoading(true);
      setError('');

      const data = await api.getElectiveOptions();

      setOpenElectives(data.openElectives || []);
      setLiberalLearning(data.liberalLearning || []);

      // Load student's existing choice
      const currentChoice = await api.getElectiveChoice();

      if (Array.isArray(currentChoice)) {
        const open = currentChoice.find(
          (item) => item.subject_category === 'open_elective'
        );

        const lll = currentChoice.find(
          (item) => item.subject_category === 'liberal_learning'
        );

        if (open) {
          setOpenChoice(String(open.subject_id));
        }

        if (lll) {
          setLllChoice(String(lll.subject_id));
        }
      }

    } catch (err) {
      setError(err.message || 'Failed to load elective subjects');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setMessage('');
    setError('');

    if (!openChoice) {
      setError('Please select one Open Elective.');
      return;
    }

    if (!lllChoice) {
      setError('Please select one Liberal Learning Module.');
      return;
    }

    try {
      setSubmitting(true);

      await api.submitElectiveChoice({
        openElectiveId: Number(openChoice),
        liberalLearningId: Number(lllChoice),
      });

      setMessage(
        'Your subject choices have been submitted successfully and are waiting for faculty approval.'
      );

      await loadElectives();

    } catch (err) {
      setError(err.message || 'Failed to submit subject choices');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="panel">
        <p>Loading elective subjects...</p>
      </div>
    );
  }

  return (
    <div>

      <div className="ledger-heading">
        <h2>Subject Selection</h2>
        <span className="count">
          Electives
        </span>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">

        <h2>Open Elective</h2>

        <p style={{ color: 'var(--muted-text)' }}>
          Select one Open Elective.
        </p>

        <div
          style={{
            display: 'grid',
            gap: 10,
            marginTop: 15
          }}
        >
          {openElectives.map((subject) => (
            <label
              key={subject.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                border: '1px solid var(--line)',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="openElective"
                value={subject.id}
                checked={openChoice === String(subject.id)}
                onChange={(e) => setOpenChoice(e.target.value)}
              />

              <div>
                <strong>{subject.name}</strong>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--muted-text)',
                    marginTop: 4
                  }}
                >
                  {subject.code} · {subject.credits} credits
                </div>
              </div>
            </label>
          ))}
        </div>

      </div>


      <div className="panel">

        <h2>Liberal Learning Module III</h2>

        <p style={{ color: 'var(--muted-text)' }}>
          Select one Liberal Learning Module.
        </p>

        <div
          style={{
            display: 'grid',
            gap: 10,
            marginTop: 15
          }}
        >
          {liberalLearning.map((subject) => (
            <label
              key={subject.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: 14,
                border: '1px solid var(--line)',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              <input
                type="radio"
                name="liberalLearning"
                value={subject.id}
                checked={lllChoice === String(subject.id)}
                onChange={(e) => setLllChoice(e.target.value)}
              />

              <div>
                <strong>{subject.name}</strong>

                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--muted-text)',
                    marginTop: 4
                  }}
                >
                  {subject.code} · {subject.credits} credit
                </div>
              </div>
            </label>
          ))}
        </div>

      </div>


      {error && (
        <div
          className="panel"
          style={{
            borderLeft: '4px solid #dc2626'
          }}
        >
          <strong>{error}</strong>
        </div>
      )}


      {message && (
        <div
          className="panel"
          style={{
            borderLeft: '4px solid #16a34a'
          }}
        >
          <strong>{message}</strong>
        </div>
      )}


      <div className="panel">

        <button
          className="btn"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting
            ? 'Submitting...'
            : 'Submit Subject Choices'}
        </button>

      </div>

    </div>
  );
}