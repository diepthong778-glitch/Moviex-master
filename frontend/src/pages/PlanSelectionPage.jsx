import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const plans = [
  {
    key: 'BASIC',
    price: '$5',
    features: ['Watch BASIC movies', 'Single device', 'HD streaming'],
  },
  {
    key: 'STANDARD',
    price: '$10',
    features: ['BASIC + STANDARD catalog', '2 devices', 'Priority support'],
  },
  {
    key: 'PREMIUM',
    price: '$20',
    features: ['All movies unlocked', '4 devices', 'Best quality'],
  },
];

function PlanSelectionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState('');
  const [error, setError] = useState('');

  const handleSelectPlan = async (planType) => {
    if (!user) {
      navigate('/login?redirect=/plans');
      return;
    }

    try {
      setLoadingPlan(planType);
      setError('');

      await axios.post('/api/subscription/select-plan', { planType });
      const paymentResponse = await axios.post('/api/payment/create', { planType });
      const paymentId = paymentResponse.data?.paymentId;

      navigate(`/payment?paymentId=${paymentId}&planType=${planType}`);
    } catch {
      setError('Failed to create payment. Please try again.');
    } finally {
      setLoadingPlan('');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Select Your Plan</h2>
          <p className="page-subtitle">Choose the plan that matches your access needs</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="admin-stats">
        {plans.map((plan) => (
          <article key={plan.key} className="account-panel" style={{ margin: 0 }}>
            <h3 className="panel-title">{plan.key}</h3>
            <p className="value-text" style={{ marginTop: '10px' }}>
              {plan.price}/month
            </p>
            <ul style={{ marginTop: '14px', paddingLeft: '18px', color: 'var(--text-secondary)' }}>
              {plan.features.map((feature) => (
                <li key={feature} style={{ marginBottom: '6px' }}>
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className="btn btn-primary"
              style={{ marginTop: '16px' }}
              onClick={() => handleSelectPlan(plan.key)}
              disabled={loadingPlan === plan.key}
            >
              {loadingPlan === plan.key ? 'Processing...' : `Select ${plan.key}`}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

export default PlanSelectionPage;
