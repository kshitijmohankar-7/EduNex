import { useEffect, useState } from 'react';
import { api } from '../services/api';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await api.getProfile();
        setProfile(data);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Unable to load profile');
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <div className="panel">
        <h2>Loading profile...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="panel">
        <h2>Unable to load profile</h2>
        <p style={{ color: 'crimson' }}>{error}</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="panel">
        <h2>Profile not found</h2>
      </div>
    );
  }

  return (
    <div>

      <div className="ledger-heading">
        <h2>My Profile</h2>
      </div>

      <hr className="ledger-rule" />

      <div className="panel">

        <div className="profile-header">
          <div className="profile-avatar">
            {profile.full_name?.charAt(0).toUpperCase()}
          </div>

          <div>
            <h2>{profile.full_name}</h2>
            <p style={{ color: 'var(--muted-text)' }}>
              {profile.student_code}
            </p>
          </div>
        </div>

        <hr className="ledger-rule" />

        <div className="card-grid">

          <div className="stat-card">
            <div className="stat-label">Email</div>
            <div
              className="stat-value"
              style={{ fontSize: 16 }}
            >
              {profile.email}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Department</div>
            <div
              className="stat-value"
              style={{ fontSize: 16 }}
            >
              {profile.department || '-'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Course</div>
            <div
              className="stat-value"
              style={{ fontSize: 16 }}
            >
              {profile.course || '-'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Semester</div>
            <div className="stat-value">
              {profile.semester || '-'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Division</div>
            <div className="stat-value">
              {profile.division || '-'}
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">Academic Year</div>
            <div
              className="stat-value"
              style={{ fontSize: 16 }}
            >
              {profile.academic_year || '-'}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}