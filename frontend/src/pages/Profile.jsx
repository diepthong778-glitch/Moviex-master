import { useState, useEffect } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import SubscriptionSection from '../components/SubscriptionSection';
import { formatVnd } from '../utils/payment';

function Profile() {
  const { user, updateSubscription } = useAuth();
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const planPrices = {
    BASIC: formatVnd(10000),
    STANDARD: formatVnd(49000),
    PREMIUM: formatVnd(99000),
  };
  const translatePlanLabel = (plan) => t(`common.plansLabel.${plan || 'NONE'}`);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/users/profile');
      setProfile(response.data || null);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    try {
      const res = await axios.post('/api/subscribe', {
        type: plan,
      });
      
      if (res.status >= 200 && res.status < 300) {
        alert(t('legacyProfilePage.planChanged', { plan: translatePlanLabel(plan) }));
        updateSubscription(plan);
        fetchProfile();
      }
    } catch (err) {
    }
  };

  if (loading) return <div style={{ paddingTop: '120px', textAlign: 'center' }}>{t('common.loading')}</div>;

  return (
    <div className="section" style={{ paddingTop: '120px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px' }}>{t('legacyProfilePage.title')}</h2>
      
      <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)', marginBottom: '32px' }}>
        <h3>{t('legacyProfilePage.profileDetails')}</h3>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}><strong>{t('common.email')}:</strong> {profile?.email}</p>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
          <strong>{t('legacyProfilePage.status')}:</strong> {profile?.verified ? <span style={{ color: '#4caf50' }}>{t('legacyProfilePage.verified')}</span> : <span style={{ color: 'var(--accent-secondary)' }}>{t('legacyProfilePage.notVerified')}</span>}
        </p>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
          <strong>{t('legacyProfilePage.roles')}:</strong> {profile?.roles?.join(', ')}
        </p>
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>{t('legacyProfilePage.currentPlan')}: {translatePlanLabel(user.subscriptionPlan)}</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {user.subscriptionPlan === 'BASIC' && t('legacyProfilePage.planDescriptions.BASIC')}
            {user.subscriptionPlan === 'STANDARD' && t('legacyProfilePage.planDescriptions.STANDARD')}
            {user.subscriptionPlan === 'PREMIUM' && t('legacyProfilePage.planDescriptions.PREMIUM')}
          </p>
        </div>
      </div>

      <SubscriptionSection key={user.subscriptionPlan} />

      <h3 style={{ marginBottom: '16px' }}>{t('legacyProfilePage.subscriptionPlans')}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        
        {['BASIC', 'STANDARD', 'PREMIUM'].map((plan) => (
          <div key={plan} style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: 'var(--radius-md)', 
            border: user.subscriptionPlan === plan ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <h4 style={{ marginBottom: '16px' }}>{translatePlanLabel(plan)}</h4>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', minHeight: '40px' }}>
              {t(`legacyProfilePage.cardDescriptions.${plan}`, { price: planPrices[plan] })}
            </p>
            {user.subscriptionPlan === plan ? (
              <button disabled className="btn" style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>{t('legacyProfilePage.currentPlanButton')}</button>
            ) : (
              <button onClick={() => handleUpgrade(plan)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {user.subscriptionPlan === 'PREMIUM' ? t('legacyProfilePage.downgrade') : t('legacyProfilePage.upgrade')}
              </button>
            )}
          </div>
        ))}
        
      </div>
    </div>
  );
}

export default Profile;
