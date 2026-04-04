import { useEffect, useState } from 'react';
import { cachedGet } from '../utils/api';

function WatchHistoryPage() {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await cachedGet('/api/history/me', {
          ttlMs: 10000,
          config: { params: { limit: 100 } },
        });
        setHistory(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load watch history.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Watch History</h2>
          <p className="page-subtitle">Movies you watched, time and progress</p>
        </div>
      </div>

      {loading && <p className="muted-text">Loading history...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="history-list">
        {!loading && !error && history.length === 0 && (
          <div className="empty-state">
            <h3 className="empty-title">No watch history yet</h3>
          </div>
        )}

        {history.map((item) => (
          <article className="history-item" key={`${item.movieId}-${item.watchedAt || item.updatedAt}`}>
            <div>
              <h3>{item.movieTitle}</h3>
              <p className="muted-text">Movie ID: {item.movieId}</p>
            </div>
            <div className="history-meta">
              <span>Progress: {item.progress ?? item.watchTime ?? 0}s</span>
              <span>{item.watchedAt ? new Date(item.watchedAt).toLocaleString() : '-'}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default WatchHistoryPage;
