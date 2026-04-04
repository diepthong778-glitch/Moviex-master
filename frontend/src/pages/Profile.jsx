import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import SubscriptionSection from '../components/SubscriptionSection';

function Profile() {
  const { user, updateSubscription } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8080/api/users/profile');
      setProfile(response.data || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan) => {
    try {
      const res = await axios.post('http://localhost:8080/api/subscribe', {
        type: plan,
      });
      
      if (res.status >= 200 && res.status < 300) {
        alert(`Successfully changed to ${plan} plan!`);
        updateSubscription(plan);
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ paddingTop: '120px', textAlign: 'center' }}>Loading...</div>;

  return (
    <div className="section" style={{ paddingTop: '120px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '24px' }}>My Account</h2>
      
      <div style={{ background: 'var(--bg-card)', padding: '32px', borderRadius: 'var(--radius-lg)', marginBottom: '32px' }}>
        <h3>Profile Details</h3>
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}><strong>Email:</strong> {profile?.email}</p>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
          <strong>Status:</strong> {profile?.verified ? <span style={{ color: '#4caf50' }}>Verified</span> : <span style={{ color: 'var(--accent-secondary)' }}>Not Verified</span>}
        </p>
        <p style={{ marginTop: '8px', color: 'var(--text-secondary)' }}>
          <strong>Roles:</strong> {profile?.roles?.join(', ')}
        </p>
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
          <h4 style={{ marginBottom: '8px', color: 'var(--accent-primary)' }}>Current Plan: {user.subscriptionPlan}</h4>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
            {user.subscriptionPlan === 'BASIC' && 'You can only watch trailers. Upgrade to watch full movies!'}
            {user.subscriptionPlan === 'STANDARD' && 'You have access to standard quality movies.'}
            {user.subscriptionPlan === 'PREMIUM' && 'You have full access to all 4k/HD content!'}
          </p>
        </div>
      </div>

      <SubscriptionSection key={user.subscriptionPlan} />

      <h3 style={{ marginBottom: '16px' }}>Subscription Plans</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px' }}>
        
        {['BASIC', 'STANDARD', 'PREMIUM'].map((plan) => (
          <div key={plan} style={{ 
            background: 'var(--bg-card)', 
            padding: '24px', 
            borderRadius: 'var(--radius-md)', 
            border: user.subscriptionPlan === plan ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
            textAlign: 'center'
          }}>
            <h4 style={{ marginBottom: '16px' }}>{plan}</h4>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)', minHeight: '40px' }}>
              {plan === 'BASIC' && 'Free - Watch trailers only'}
              {plan === 'STANDARD' && '$5/mo - Watch most movies'}
              {plan === 'PREMIUM' && '$8/mo - Watch all movies'}
            </p>
            {user.subscriptionPlan === plan ? (
              <button disabled className="btn" style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>Current Plan</button>
            ) : (
              <button onClick={() => handleUpgrade(plan)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                {user.subscriptionPlan === 'PREMIUM' ? 'Downgrade' : 'Upgrade'}
              </button>
            )}
          </div>
        ))}
        
      </div>
    </div>
  );
}

export default Profile;
