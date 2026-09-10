import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function Announcements({ compact = false }) {
  const { user } = useAuth();
  const canPost = user?.role === 'faculty' || user?.role === 'admin';

  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadAnnouncements() {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAnnouncements();
      setAnnouncements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function handlePost(event) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Please enter both a title and announcement message.');
      return;
    }

    try {
      setPosting(true);
      setError('');
      setSuccess('');
      await api.createAnnouncement({ title, body });
      setTitle('');
      setBody('');
      setSuccess('Announcement posted successfully.');
      await loadAnnouncements();
    } catch (err) {
      setError(err.message || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
  }

  const visibleAnnouncements = compact ? announcements.slice(0, 5) : announcements;

  return (
    <div className="panel">
      <div className="ledger-heading">
        <div>
          <h2>{canPost ? 'Announcements' : 'Announcements & Notices'}</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            {user?.role === 'student'
              ? 'Important notices from faculty and administration.'
              : user?.role === 'faculty'
                ? 'Send notices to your department students and view administration notices.'
                : 'Publish important college notices for students and faculty.'}
          </p>
        </div>
        {!loading && <span className="count">{announcements.length}</span>}
      </div>

      {canPost && (
        <form onSubmit={handlePost} style={{ marginBottom: 20 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <input
              className="input"
              type="text"
              placeholder="Announcement title"
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
            />
            <textarea
              className="input"
              placeholder="Write the notice / announcement..."
              value={body}
              rows={4}
              onChange={(e) => setBody(e.target.value)}
            />
            <div>
              <button className="btn" type="submit" disabled={posting}>
                {posting ? 'Posting...' : 'Post Announcement'}
              </button>
            </div>
          </div>
        </form>
      )}

      {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}
      {success && <div style={{ marginBottom: 12 }}>{success}</div>}

      {loading ? (
        <p>Loading announcements...</p>
      ) : visibleAnnouncements.length === 0 ? (
        <p>No announcements available.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {visibleAnnouncements.map((announcement) => (
            <article
              key={announcement.id}
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: 16,
                background: 'var(--panel-bg)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>{announcement.title}</h3>
                <span className="count">{formatDate(announcement.created_at)}</span>
              </div>
              <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, marginBottom: 10 }}>
                {announcement.body}
              </p>
              <small style={{ color: 'var(--muted-text)' }}>
                Posted by {announcement.posted_by_name || 'Administration'}
                {announcement.posted_by_role === 'admin' ? ' · Administration' : ' · Faculty'}
              </small>
            </article>
          ))}
        </div>
      )}

      {compact && announcements.length > 5 && (
        <p style={{ color: 'var(--muted-text)', marginBottom: 0 }}>
          Showing the 5 most recent announcements.
        </p>
      )}
    </div>
  );
}
