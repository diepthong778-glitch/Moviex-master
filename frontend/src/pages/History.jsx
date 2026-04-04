import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../utils/api';

function History() {
  const { getToken } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await axios.get('/api/history', {
          headers: authHeaders(getToken()),
        });

        setHistory(response.data || []);
      } catch (err) {
        setError('Failed to load watch history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [getToken]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Watch History</h2>
          <p className="page-subtitle">Recently watched movies and progress</p>
        </div>
      </div>

      {loading && <p className="muted-text">Loading history...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && history.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⌛</div>
          <h3 className="empty-title">No watch history yet</h3>
        </div>
      )}

      <div className="history-list">
        {history.map((item) => (
          <div className="history-item" key={`${item.movieId}-${item.updatedAt}`}>
            <div>
              <h3>{item.movieTitle}</h3>
              <p className="muted-text">Movie ID: {item.movieId}</p>
            </div>
            <div className="history-meta">
              <span>{item.watchTime} min watched</span>
              <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default History;
