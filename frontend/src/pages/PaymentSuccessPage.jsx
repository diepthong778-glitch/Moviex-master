import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../utils/api';
import { formatVnd } from '../utils/payment';

const resolveSafeRedirectPath = (redirectPath) => {
  if (typeof redirectPath !== 'string') return '/browse';
  const trimmedPath = redirectPath.trim();
  if (!trimmedPath.startsWith('/') || trimmedPath.startsWith('//') || trimmedPath.includes('\\')) {
    return '/browse';
  }
  return trimmedPath;
};

function PaymentSuccessPage() {
  const { t } = useTranslation();
  const { txnCode } = useParams();
  const navigate = useNavigate();
  const { syncPaymentEntitlements } = useAuth();
  const [transaction, setTransaction] = useState(null);
  const [countdown, setCountdown] = useState(3);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadTransaction = async () => {
      try {
        const response = await axios.get(`/api/payment/public/transactions/${encodeURIComponent(txnCode)}`);
        if (ignore) return;
        setTransaction(response.data);

        if (response.data?.status === 'SUCCESS' && getStoredToken()) {
          try {
            const entitlementsResponse = await axios.get('/api/payment/entitlements/me');
            if (!ignore) {
              syncPaymentEntitlements(entitlementsResponse.data);
            }
          } catch {
            // Ignore if the current browser session is not authenticated.
          }
        }
      } catch {
        if (!ignore) {
          setError(t('paymentSuccessPage.loadFailed'));
        }
      }
    };

    loadTransaction();

    return () => {
      ignore = true;
    };
  }, [txnCode, syncPaymentEntitlements]);

  useEffect(() => {
    if (!transaction?.redirectPath || transaction.status !== 'SUCCESS') return undefined;

    const intervalId = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          navigate(resolveSafeRedirectPath(transaction.redirectPath), { replace: true });
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [transaction, navigate]);

  if (error) {
    return (
      <div className="sandbox-mobile-shell">
        <div className="sandbox-mobile-card sandbox-mobile-card-error">
          <h1>MovieX Sandbox</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="sandbox-mobile-shell">
        <div className="sandbox-mobile-card">
          <h1>MovieX Sandbox</h1>
          <p>{t('paymentSuccessPage.loading')}</p>
        </div>
      </div>
    );
  }

  const isSuccess = transaction?.status === 'SUCCESS';

  return (
    <div className="sandbox-mobile-shell">
      <div className={`sandbox-mobile-card ${isSuccess ? 'sandbox-mobile-card-success' : 'sandbox-mobile-card-error'}`}>
        <div className={isSuccess ? 'sandbox-checkmark-large' : 'sandbox-crossmark-large'}>
          {isSuccess ? '✓' : '!'}
        </div>

        <h1>{isSuccess ? t('paymentSuccessPage.successTitle') : t('paymentSuccessPage.failedTitle')}</h1>
        <p className="sandbox-success-copy">
          {isSuccess
            ? t('paymentSuccessPage.successCopy')
            : t('paymentSuccessPage.failedCopy')}
        </p>

        {transaction && (
          <section className="sandbox-mobile-list">
            <div className="sandbox-mobile-row">
              <span>{t('paymentSuccessPage.txnCode')}</span>
              <strong>{transaction.txnCode}</strong>
            </div>
            <div className="sandbox-mobile-row">
              <span>{t('paymentSuccessPage.amount')}</span>
              <strong>{formatVnd(transaction.amount)}</strong>
            </div>
            <div className="sandbox-mobile-row">
              <span>{t('paymentSuccessPage.content')}</span>
              <strong>{transaction.paymentContent}</strong>
            </div>
            <div className="sandbox-mobile-row">
              <span>{t('paymentSuccessPage.destination')}</span>
              <strong>{transaction.redirectPath}</strong>
            </div>
          </section>
        )}

        {isSuccess && <p className="sandbox-countdown">{t('paymentSuccessPage.redirectCountdown', { count: countdown })}</p>}

        <button
          type="button"
          className="btn btn-primary sandbox-btn"
          onClick={() => navigate(resolveSafeRedirectPath(transaction?.redirectPath), { replace: true })}
        >
          {isSuccess ? t('paymentSuccessPage.backToMovie') : t('paymentSuccessPage.returnToMoviex')}
        </button>
      </div>
    </div>
  );
}

export default PaymentSuccessPage;
