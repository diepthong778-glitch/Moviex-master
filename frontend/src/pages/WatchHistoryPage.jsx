import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { cachedGet, extractErrorMessage } from '../utils/api';
import HistorySection from '../components/HistorySection';
import PageTransition from '../components/motion/PageTransition';

function WatchHistoryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await cachedGet('/api/history/me', {
        ttlMs: 5000,
        config: { params: { limit: 100 } },
      });
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to load watch history.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleContinue = (item) => {
    navigate(`/browse?play=${item.movieId}&t=${item.progress || 0}`);
  };

  const handleRestart = (item) => {
    navigate(`/browse?play=${item.movieId}&t=0`);
  };

  const handleRemove = async (item) => {
    try {
      await axios.delete(`/api/history/me/${item.movieId}`);
      setHistory((prev) => prev.filter((h) => h.movieId !== item.movieId));
    } catch (err) {
      console.error('Failed to remove history item:', err);
    }
  };

  return (
    <PageTransition className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('watchHistory.title') || 'Watch History'}</h2>
          <p className="page-subtitle">{t('watchHistory.subtitle') || 'Movies you have watched on Moviex'}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-8 px-4">
        {error && <p className="error-text mb-6">{error}</p>}

        <HistorySection
          items={history}
          loading={loading}
          onContinue={handleContinue}
          onRestart={handleRestart}
          onRemove={handleRemove}
          title={t('watchHistory.recentActivity') || 'Recent Activity'}
          countLabel={t('watchHistory.itemsCount', { count: history.length }) || `${history.length} items`}
          emptyLabel={t('watchHistory.empty') || 'No watch history yet. Start watching some movies!'}
        />
      </div>
    </PageTransition>
  );
}

export default WatchHistoryPage;
