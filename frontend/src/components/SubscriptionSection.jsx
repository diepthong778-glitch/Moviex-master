import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authHeaders, cachedGet } from '../utils/api';

function SubscriptionSection() {
  const { getToken } = useAuth();
  const { t } = useTranslation();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const translatePlanLabel = (plan) => t(`common.plansLabel.${plan || 'NONE'}`);
  const translateStatusLabel = (active) =>
    t(`common.statusLabel.${active ? 'ACTIVE' : 'INACTIVE'}`);

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
        setError(t('subscriptionWidget.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, [getToken, t]);

  if (loading) {
    return (
      <div className="account-panel">
        <h3 className="panel-title">{t('subscriptionWidget.title')}</h3>
        <p className="muted-text">{t('subscriptionWidget.loading')}</p>
      </div>
    );
  }

  return (
    <div className="account-panel">
      <div className="panel-header">
        <h3 className="panel-title">{t('subscriptionWidget.title')}</h3>
        <span className={`status-pill ${subscription?.active ? 'status-active' : 'status-inactive'}`}>
          {translateStatusLabel(subscription?.active)}
        </span>
      </div>

      {error ? (
        <p className="error-text">{error}</p>
      ) : (
        <div className="account-grid">
          <div>
            <span className="label-text">{t('subscriptionWidget.plan')}</span>
            <p className="value-text">{translatePlanLabel(subscription?.type)}</p>
          </div>
          <div>
            <span className="label-text">{t('subscriptionWidget.expires')}</span>
            <p className="value-text">
              {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString() : t('subscriptionWidget.noExpiry')}
            </p>
          </div>
          <div>
            <span className="label-text">{t('subscriptionWidget.startDate')}</span>
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
