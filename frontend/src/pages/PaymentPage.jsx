import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function PaymentPage() {
  const navigate = useNavigate();
  const { updateSubscription } = useAuth();
  const [searchParams] = useSearchParams();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const paymentId = searchParams.get('paymentId');
  const planType = searchParams.get('planType');

  const qrUrl = useMemo(() => {
    if (!paymentId) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=MOVIEX-${paymentId}`;
  }, [paymentId]);

  const handleConfirmPayment = async () => {
    if (!paymentId) {
      setError('Missing payment information.');
      return;
    }

    try {
      setConfirming(true);
      setError('');
      setMessage('');

      const response = await axios.post('/api/payment/confirm', { paymentId });
      const activatedPlan = response.data?.subscription?.planType || planType;
      if (activatedPlan) {
        updateSubscription(activatedPlan);
      }

      setMessage('Payment successful. Redirecting to home...');
      setTimeout(() => navigate('/'), 1500);
    } catch {
      setError('Payment confirmation failed. Please retry.');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Payment QR</h2>
          <p className="page-subtitle">Scan QR and confirm to activate your subscription</p>
        </div>
      </div>

      <div className="account-panel" style={{ textAlign: 'center' }}>
        <p className="muted-text" style={{ marginBottom: '10px' }}>
          Plan: <strong>{planType || '-'}</strong>
        </p>
        {qrUrl ? (
          <img src={qrUrl} alt="Payment QR" width="240" height="240" style={{ borderRadius: '12px' }} />
        ) : (
          <p className="error-text">Payment ID not found.</p>
        )}

        <div style={{ marginTop: '18px' }}>
          <button className="btn btn-primary" onClick={handleConfirmPayment} disabled={confirming || !paymentId}>
            {confirming ? 'Confirming...' : 'Confirm Payment'}
          </button>
        </div>

        {message && <p className="muted-text" style={{ marginTop: '14px' }}>{message}</p>}
        {error && <p className="error-text" style={{ marginTop: '14px' }}>{error}</p>}
      </div>
    </div>
  );
}

export default PaymentPage;
