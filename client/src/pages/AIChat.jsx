import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const SUGGESTIONS = [
  'What is my attendance?',
  'Show my published marks',
  'Which subjects should I focus on?',
  'Help me make a study plan',
  'What assignments do I need to complete?',
];

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm EduNex AI. I can help with your attendance, marks, assignments, study materials, and study planning.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);

    try {
      const response = await api.chat(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.reply || 'I could not generate a response right now.',
        },
      ]);
    } catch (err) {
      setError(err.message || 'Unable to connect to EduNex AI.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>EduNex AI Assistant</h2>
          <span className="count">Personalized student assistant</span>
        </div>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">
        <div className="chat-window">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`chat-bubble ${message.role}`}>
                {message.text}
              </div>
            ))}

            {loading && (
              <div className="chat-bubble assistant">
                EduNex AI is thinking...
              </div>
            )}

            <div ref={endRef} />
          </div>

          <div style={{ padding: '0 14px 10px' }}>
            {SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="suggestion-chip"
                onClick={() => send(suggestion)}
                disabled={loading}
              >
                {suggestion}
              </button>
            ))}
          </div>

          {error && (
            <div className="error-text" style={{ padding: '0 14px 10px' }}>
              {error}
            </div>
          )}

          <form
            className="chat-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask EduNex AI..."
              disabled={loading}
            />
            <button className="btn" type="submit" disabled={loading || !input.trim()}>
              {loading ? 'Thinking...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
