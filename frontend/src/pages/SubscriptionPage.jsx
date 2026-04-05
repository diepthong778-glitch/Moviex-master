import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cachedGet } from '../utils/api';

function SubscriptionPage() {
  const { t } = useTranslation();
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
        setError(t('subscriptionPage.loadFailed'));
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
          <h2 className="page-title">{t('subscriptionPage.title')}</h2>
          <p className="page-subtitle">{t('subscriptionPage.subtitle')}</p>
        </div>
      </div>

      <div className="account-panel">
        {loading && <p className="muted-text">{t('subscriptionPage.loading')}</p>}
        {error && <p className="error-text">{error}</p>}

        {!loading && !error && (
          <div className="account-grid">
            <div>
              <span className="label-text">{t('subscriptionPage.currentPlan')}</span>
              <p className="value-text">{planType}</p>
            </div>
            <div>
              <span className="label-text">{t('subscriptionPage.remainingDays')}</span>
              <p className="value-text">{remainingDays}</p>
            </div>
            <div>
              <span className="label-text">{t('subscriptionPage.expirationDate')}</span>
              <p className="value-text">{expirationDate}</p>
            </div>
            <div>
              <span className="label-text">{t('subscriptionPage.status')}</span>
              <p className="value-text">{subscription?.status || 'EXPIRED'}</p>
            </div>
          </div>
        )}

        <div style={{ marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/plans')}>
            {t('subscriptionPage.upgradePlan')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionPage;
