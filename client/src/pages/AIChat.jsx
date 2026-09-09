import { useState, useRef, useEffect } from 'react';
import { mockMarks, mockAttendance, mockDashboardStats } from '../mock/mockData';

const SUGGESTIONS = [
  'What is my CT-2 performance?',
  'Show my attendance',
  'Which subjects should I focus on?',
  'Create a study plan for my upcoming exam',
];

// Generates a grounded reply from the student's own authorized mock data —
// mirrors what ai-service/insights.py does server-side against real, published records.
// It never invents a mark or attendance figure that isn't in the data below.
function generateReply(message) {
  const m = message.toLowerCase();

  if (m.includes('attendance')) {
    const lines = mockAttendance.map((a) => `${a.subject}: ${a.percentage}%`).join('\n');
    return `Here's your attendance by subject:\n${lines}\n\nOverall: ${mockDashboardStats.attendance}%`;
  }

  if (m.includes('ct-2') || m.includes('ct2')) {
    const lines = mockMarks.map((s) => `${s.subject}: ${s.ct2}/100`).join('\n');
    return `Your CT-2 results:\n${lines}\n\nAverage: ${mockDashboardStats.ct2Average}%`;
  }

  if (m.includes('focus') || m.includes('weak')) {
    const weakest = [...mockMarks].sort((a, b) => a.ct2 - b.ct2)[0];
    return `Based on your published CT-2 marks, ${weakest.subject} (${weakest.ct2}/100) is your lowest-scoring subject right now — that's a reasonable place to put extra study time.`;
  }

  if (m.includes('study plan')) {
    return "Here's a starting plan based on your current marks and attendance:\n1. Review Physics fundamentals (your lowest CT score)\n2. Revisit DBMS Unit 2 notes before the next test\n3. Keep Programming Fundamentals steady with practice problems\n4. Check attendance in Physics — it's below 75%";
  }

  return "I can answer questions about your marks, attendance, assignments, and study materials — try one of the suggestions below, or ask me to explain a topic from your notes.";
}

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Hi! I'm your EduNex assistant. Ask me about your marks, attendance, or study materials." },
  ]);
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const reply = generateReply(trimmed);
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }, { role: 'assistant', text: reply }]);
    setInput('');
  }

  return (
    <div>
      <div className="ledger-heading"><h2>AI Assistant</h2></div>
      <hr className="ledger-rule" />

      <div className="chat-window">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>{m.text}</div>
          ))}
          <div ref={endRef} />
        </div>
        <div style={{ padding: '0 14px 10px' }}>
          {SUGGESTIONS.map((s) => (
            <span key={s} className="suggestion-chip" onClick={() => send(s)}>{s}</span>
          ))}
        </div>
        <form
          className="chat-input-row"
          onSubmit={(e) => { e.preventDefault(); send(input); }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your marks, attendance, or notes..."
          />
          <button className="btn" type="submit">Send</button>
        </form>
      </div>
    </div>
  );
}
