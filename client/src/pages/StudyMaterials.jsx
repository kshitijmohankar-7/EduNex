import { useEffect, useState } from 'react';
import { api } from '../services/api';

const SERVER_URL = 'http://localhost:5000';

export default function StudyMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadMaterials() {
      try {
        setLoading(true);
        setError('');

        const data = await api.getMaterials();

        console.log('REAL MATERIALS FROM DATABASE:', data);

        setMaterials(data);
      } catch (err) {
        console.error('Failed to load materials:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadMaterials();
  }, []);

  function getFileUrl(filePath) {
    if (!filePath) return '#';

    // Already a complete URL
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    // Convert Windows backslashes to normal web slashes
    let normalizedPath = filePath.replace(/\\/g, '/');

    // Find /uploads/ anywhere in the stored path
    const uploadsIndex = normalizedPath.toLowerCase().indexOf('/uploads/');

    if (uploadsIndex !== -1) {
      return `${SERVER_URL}${normalizedPath.substring(uploadsIndex)}`;
    }

    // If backend already returns something like uploads/study-material/file.pdf
    if (normalizedPath.startsWith('uploads/')) {
      return `${SERVER_URL}/${normalizedPath}`;
    }

    return `${SERVER_URL}/${normalizedPath}`;
  }

  function getFileType(material) {
    if (!material.file_type) {
      return 'FILE';
    }

    if (material.file_type.includes('pdf')) {
      return 'PDF';
    }

    if (
      material.file_type.includes('word') ||
      material.file_type.includes('msword')
    ) {
      return 'DOC';
    }

    return material.file_type;
  }

  if (loading) {
    return (
      <div>
        <div className="ledger-heading">
          <h2>Study Materials</h2>
        </div>

        <hr className="ledger-rule" />

        <div className="panel">
          <p>Loading study materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="ledger-heading">
        <h2>Study Materials</h2>
      </div>

      <hr className="ledger-rule" />

      {error && (
        <div className="panel">
          <div className="error-text">
            {error}
          </div>
        </div>
      )}

      {!error && materials.length === 0 && (
        <div className="panel">
          <p>No study materials available.</p>
        </div>
      )}

      {!error && materials.length > 0 && (
        <div>
          {materials.map((material) => (
            <div className="panel" key={material.id}>

              <div className="ledger-heading">
                <h2>
                  {material.code || material.subject || 'Study Material'}
                </h2>
              </div>

              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Unit</th>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Uploaded</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  <tr>
                    <td>
                      {material.unit || '-'}
                    </td>

                    <td>
                      {material.title}
                    </td>

                    <td>
                      {getFileType(material)}
                    </td>

                    <td>
                      {material.uploaded_at
                        ? new Date(material.uploaded_at).toLocaleDateString()
                        : '-'}
                    </td>

                    <td>
                      <a
                        href={getFileUrl(material.file_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-outline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}