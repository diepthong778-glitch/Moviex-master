import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cachedGet } from '../utils/api';

function SubscriptionPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await cachedGet('/api/subscription/me', { ttlMs: 10000 });
        setSubscription(data);
      } catch {
        setError('Failed to load subscription.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const planType = subscription?.planType || 'NONE';
  const remainingDays = subscription?.remainingDays ?? 0;
  const expirationDate = subscription?.endDate || '-';

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">My Subscription</h2>
          <p className="page-subtitle">Manage plan and expiration</p>
        </div>
      </div>

      <div className="account-panel">
        {loading && <p className="muted-text">Loading subscription...</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <div className="account-grid">
            <div>
              <span className="label-text">Current Plan</span>
              <p className="value-text">{planType}</p>
            </div>
            <div>
              <span className="label-text">Remaining Days</span>
              <p className="value-text">{remainingDays}</p>
            </div>
            <div>
              <span className="label-text">Expiration Date</span>
              <p className="value-text">{expirationDate}</p>
            </div>
            <div>
              <span className="label-text">Status</span>
              <p className="value-text">{subscription?.status || 'EXPIRED'}</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/plans')}>
            Upgrade Plan
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;
