import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authHeaders, cachedGet } from '../utils/api';

function SubscriptionSection() {
  const { getToken } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        setLoading(true);
        setError('');

        const token = getToken();
        const data = await cachedGet('/api/subscription', {
          ttlMs: 10000,
          config: {
            headers: authHeaders(token),
          },
        });

        setSubscription(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load subscription.');
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [getToken]);

  if (loading) {
    return (
      <div className="account-panel">
        <h3 className="panel-title">Subscription</h3>
        <p className="muted-text">Loading subscription...</p>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <div className="panel-header">
        <h3 className="panel-title">Subscription</h3>
        <span className={`status-pill ${subscription?.active ? 'status-active' : 'status-inactive'}`}>
          {subscription?.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      {error ? (
        <p className="error-text">{error}</p>
      ) : (
        <div className="account-grid">
          <div>
            <span className="label-text">Plan</span>
            <p className="value-text">{subscription?.type || 'NONE'}</p>
          </div>
          <div>
            <span className="label-text">Expires</span>
            <p className="value-text">
              {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'No expiry'}
            </p>
          </div>
          <div>
            <span className="label-text">Start Date</span>
            <p className="value-text">
              {subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString() : '-'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionSection;
