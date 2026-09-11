import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const SUGGESTIONS = [
  'What is my attendance?',
  'Show my published marks',
  'Which subjects should I focus on?',
  'Help me make a study plan',
  'What assignments do I need to complete?',
  'According to my study materials, explain the latest topic',
];

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>;
    }
    return <span key={index}>{part}</span>;
  });
}

function AssistantMessage({ text, sources = [], usedRag = false }) {
  const lines = String(text || '').split('\n');
  const blocks = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(
        <p key={`p-${blocks.length}`} style={{ margin: '0 0 10px' }}>
          {renderInline(paragraph.join(' '))}
        </p>
      );
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      blocks.push(
        <ul key={`ul-${blocks.length}`} style={{ margin: '0 0 10px', paddingLeft: 22 }}>
          {list.map((item, index) => <li key={index}>{renderInline(item)}</li>)}
        </ul>
      );
      list = [];
    }
  };

  const flushCode = () => {
    if (code.length) {
      blocks.push(
        <pre key={`code-${blocks.length}`} style={{ overflowX: 'auto', margin: '0 0 10px', padding: 12, border: '1px solid var(--line)', borderRadius: 4 }}>
          <code>{code.join('\n')}</code>
        </pre>
      );
      code = [];
    }
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushParagraph();
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      code.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      return;
    }

    if (/^#{1,4}\s+/.test(trimmed)) {
      flushParagraph();
      flushList();
      const heading = trimmed.replace(/^#{1,4}\s+/, '');
      blocks.push(
        <div key={`h-${blocks.length}`} style={{ fontWeight: 700, fontSize: 15, margin: '10px 0 6px' }}>
          {renderInline(heading)}
        </div>
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      flushParagraph();
      list.push(trimmed.replace(/^[-*]\s+/, ''));
      return;
    }

    if (/^\d+[.)]\s+/.test(trimmed)) {
      flushParagraph();
      list.push(trimmed.replace(/^\d+[.)]\s+/, ''));
      return;
    }

    paragraph.push(trimmed);
  });

  if (inCode) flushCode();
  flushParagraph();
  flushList();

  return (
    <>
      {blocks.length ? blocks : <span>{text}</span>}
      {usedRag && sources.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)', fontSize: 12 }}>
          <strong>Sources from study materials:</strong>
          <ul style={{ margin: '5px 0 0', paddingLeft: 18 }}>
            {[...new Map(sources.map((source) => [source.title, source])).values()].map((source, index) => (
              <li key={`${source.title}-${index}`}>{source.title}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function indiaDateKey(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function indiaDisplayDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function announcementQuestion(message) {
  const text = String(message || '').toLowerCase();
  return /\b(announcement|announcements|notice|notices|circular|circulars)\b/.test(text);
}

function requestedAnnouncementDate(message) {
  const text = String(message || '').toLowerCase();
  const now = new Date();

  if (/\byesterday\b/.test(text)) {
    now.setDate(now.getDate() - 1);
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);
  }

  if (/\btoday\b/.test(text)) {
    return indiaDateKey(new Date());
  }

  return null;
}

function formatAnnouncementReply(message, announcements) {
  const rows = Array.isArray(announcements) ? [...announcements] : [];
  rows.sort((a, b) => {
    const left = new Date(a.created_at || 0).getTime();
    const right = new Date(b.created_at || 0).getTime();
    return right - left;
  });

  const requestedDate = requestedAnnouncementDate(message);
  let matches = requestedDate
    ? rows.filter((item) => indiaDateKey(item.created_at) === requestedDate)
    : rows;

  const text = String(message || '').toLowerCase();
  const asksLatest = /\b(latest|last|recent|newest|most recent)\b/.test(text);
  if (!requestedDate && asksLatest) matches = matches.slice(0, 1);

  if (!matches.length) {
    if (requestedDate) {
      const label = /\byesterday\b/.test(text) ? 'yesterday' : 'today';
      return `## Announcements\n\nThere were no announcements available for **${label}**.`;
    }
    return '## Announcements\n\nThere are no announcements available for you right now.';
  }

  const heading = requestedDate
    ? (/\byesterday\b/.test(text) ? "Yesterday's Announcements" : "Today's Announcements")
    : asksLatest ? 'Latest Announcement' : 'Announcements';

  const lines = [`## ${heading}`, ''];
  matches.forEach((item, index) => {
    lines.push(`### ${index + 1}. ${item.title || 'Untitled announcement'}`);
    lines.push(`**Posted:** ${indiaDisplayDate(item.created_at)}`);
    if (item.posted_by_name) {
      lines.push(`**Posted by:** ${item.posted_by_name}${item.posted_by_role ? ` (${item.posted_by_role})` : ''}`);
    }
    lines.push('');
    lines.push(item.body || 'No announcement details were provided.');
    lines.push('');
  });

  lines.push('---');
  lines.push('This answer was read directly from your EduNex announcements, so it does not require Gemini AI quota.');
  return lines.join('\n');
}

export default function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hi! I'm EduNex AI. I can access the student information available to your EduNex dashboard, including attendance, published marks, assignments, announcements, study materials, achievements, electives, marksheets, and profile details. I can also explain academic concepts completely and answer questions from your uploaded study materials.",
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

    const history = messages.map((message) => ({
      role: message.role,
      content: message.text,
    }));

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setLoading(true);

    try {
      // Questions whose answer is already structured data in EduNex should not
      // consume Gemini quota. This makes announcement lookups reliable even
      // when the external AI model is rate-limited.
      if (announcementQuestion(trimmed)) {
        const announcements = await api.getAnnouncements();
        const reply = formatAnnouncementReply(trimmed, announcements);
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: reply,
            sources: [],
            usedRag: false,
          },
        ]);
        return;
      }

      const response = await api.chat(trimmed, history);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: response.reply || 'I could not generate a response right now.',
          sources: response.sources || [],
          usedRag: Boolean(response.used_rag),
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
          <span className="count">Personalized student assistant · Dashboard-aware · RAG-enabled</span>
        </div>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">
        <div className="chat-window">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`chat-bubble ${message.role}`}>
                {message.role === 'assistant' ? (
                  <AssistantMessage
                    text={message.text}
                    sources={message.sources}
                    usedRag={message.usedRag}
                  />
                ) : message.text}
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
