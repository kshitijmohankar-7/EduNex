import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Communication() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [contactId, setContactId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const selectedId = Number(contactId);
  const selectedContact = contacts.find(c => c.id === selectedId);
  const conversation = useMemo(
    () => messages
      .filter(m => m.sender_user_id === selectedId || m.recipient_user_id === selectedId)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at)),
    [messages, selectedId]
  );

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [contactData, messageData] = await Promise.all([
        api.getCommunicationContacts(),
        api.getMessages()
      ]);
      const nextContacts = contactData.items || [];
      setContacts(nextContacts);
      setMessages(messageData.items || []);
      if (!contactId && nextContacts.length) setContactId(String(nextContacts[0].id));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    messages
      .filter(m => m.recipient_user_id === user?.id && !m.read_at)
      .forEach(m => api.markMessageRead(m.id).catch(() => {}));
  }, [messages, user?.id]);

  async function send(e) {
    e?.preventDefault();
    if (!selectedId || !body.trim()) return;
    setSending(true);
    setError('');
    try {
      await api.sendMessage({ recipientUserId: selectedId, subject, body: body.trim() });
      setBody('');
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <span className="dashboard-kicker">Communication</span>
          <h1>{user?.role === 'faculty' ? 'Student Doubt Desk' : 'Faculty Communication'}</h1>
          <p>{user?.role === 'faculty' ? 'Reply to student academic doubts directly.' : 'Send an academic doubt directly to your selected faculty.'}</p>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <section className="panel">
        <form onSubmit={send}>
          <label>
            {user?.role === 'faculty' ? 'Student' : 'Faculty'}
            <select value={contactId} onChange={e => setContactId(e.target.value)} required>
              <option value="">Select {user?.role === 'faculty' ? 'student' : 'faculty'}</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.full_name}{c.email ? ` — ${c.email}` : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Subject
            <input value={subject} onChange={e => setSubject(e.target.value)} maxLength={200} placeholder="e.g. Data Structures doubt" />
          </label>
          <label>
            Message
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} maxLength={5000} placeholder="Describe your doubt or reply..." required />
          </label>
          <button className="btn" type="submit" disabled={sending || !selectedId}>
            {sending ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Conversation</span>
            <h2>{selectedContact ? selectedContact.full_name : 'Select a contact'}</h2>
          </div>
          <span>{conversation.length} message{conversation.length === 1 ? '' : 's'}</span>
        </div>
        {loading ? <div className="tool-empty">Loading messages…</div> :
          conversation.length ? conversation.map(m => (
            <article className="academic-subject-card" key={m.id}>
              <strong>{m.sender_user_id === user?.id ? 'You' : m.sender_name}</strong>
              {m.subject && <small>{m.subject}</small>}
              <span>{m.body}</span>
              <small>{new Date(m.created_at).toLocaleString()}</small>
            </article>
          )) : <div className="tool-empty">No messages with this contact yet.</div>}
      </section>
    </div>
  );
}
