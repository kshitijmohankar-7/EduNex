import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

export default function Achievements() {
  const [achievements, setAchievements] = useState([]);
  const [title, setTitle] = useState('');
  const [organization, setOrganization] = useState('');
  const [description, setDescription] = useState('');
  const [achievedOn, setAchievedOn] = useState('');
  const [certificate, setCertificate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const certificateInputRef = useRef(null);

  async function loadAchievements() {
    try {
      setLoading(true);
      setError('');
      const data = await api.getAchievements();
      setAchievements(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAchievements();
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !organization.trim()) {
      setError('Title and organization are required.');
      return;
    }
    if (!certificate) {
      setError('Please upload the certificate.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('organization', organization.trim());
    formData.append('description', description.trim());
    formData.append('achievedOn', achievedOn);
    formData.append('certificate', certificate);

    try {
      setSaving(true);
      await api.addAchievement(formData);
      setTitle('');
      setOrganization('');
      setDescription('');
      setAchievedOn('');
      setCertificate(null);
      if (certificateInputRef.current) {
        certificateInputRef.current.value = '';
      }
      setSuccess('Certificate uploaded successfully.');
      await loadAchievements();
    } catch (err) {
      setError(err.message || 'Failed to upload certificate');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="ledger-heading">
        <div>
          <h2>Achievements &amp; Certifications</h2>
          <p style={{ margin: '6px 0 0', color: 'var(--muted-text)' }}>
            Upload certificates and keep your verified achievements in one place.
          </p>
        </div>
        <span className="count">{achievements.length} certificates</span>
      </div>
      <hr className="ledger-rule" />

      {(error || success) && (
        <div className="panel">
          {error && <div className="error-text">{error}</div>}
          {success && <div style={{ color: 'var(--success, #16803a)' }}>{success}</div>}
        </div>
      )}

      <div className="panel">
        <div className="ledger-heading"><h2>Upload Certificate</h2></div>
        <form onSubmit={handleAdd}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            <div className="field">
              <label>Certificate Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Java Programming Certificate" />
            </div>
            <div className="field">
              <label>Organization *</label>
              <input value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="e.g. Coursera / Google / College" />
            </div>
            <div className="field">
              <label>Date Received</label>
              <input type="date" value={achievedOn} onChange={(e) => setAchievedOn(e.target.value)} />
            </div>
            <div className="field">
              <label>Certificate File *</label>
              <input
                ref={certificateInputRef}
                id="achievement-certificate"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setCertificate(e.target.files?.[0] || null)}
              />
              <small style={{ color: 'var(--muted-text)' }}>PDF, JPG, PNG or WEBP · max 10 MB</small>
            </div>
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Add a short description of the certificate or achievement" />
          </div>

          <button className="btn" type="submit" disabled={saving}>
            {saving ? 'Uploading...' : 'Upload Certificate'}
          </button>
        </form>
      </div>

      <div className="panel">
        <div className="ledger-heading"><h2>My Certificates</h2></div>
        {loading ? <p>Loading certificates...</p> : achievements.length === 0 ? (
          <p>No certificates uploaded yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {achievements.map((achievement) => (
              <div key={achievement.id} style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{achievement.title}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-text)', marginTop: 4 }}>
                  {achievement.organization}
                  {achievement.achieved_on ? ` · ${new Date(achievement.achieved_on).toLocaleDateString()}` : ''}
                </div>
                {achievement.description && <p style={{ margin: '9px 0', fontSize: 13 }}>{achievement.description}</p>}
                {achievement.certificate_path && (
                  <a className="btn btn-outline" href={api.getFileUrl(achievement.certificate_path)} target="_blank" rel="noreferrer">
                    View Certificate
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
