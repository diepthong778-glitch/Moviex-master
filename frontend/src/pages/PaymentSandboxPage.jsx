import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { formatVnd } from '../utils/payment';

function PaymentSandboxPage() {
  const { t } = useTranslation();
  const { txnCode } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const fetchTransaction = async () => {
      try {
        const response = await axios.get(`/api/payment/public/transactions/${encodeURIComponent(txnCode)}`);
        if (!ignore) {
          setTransaction(response.data);
        }
      } catch {
        if (!ignore) {
          setError(t('paymentSandboxPage.notFound'));
        }
      }
    };

    fetchTransaction();

    return () => {
      ignore = true;
    };
  }, [txnCode]);

  const handleConfirm = async () => {
    try {
      setSubmitting(true);
      setError('');
      const response = await axios.post(`/api/payment/public/transactions/${encodeURIComponent(txnCode)}/confirm`);
      navigate(`/payment-success/${encodeURIComponent(response.data.txnCode)}`, { replace: true });
    } catch {
      setError(t('paymentSandboxPage.confirmFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFail = async () => {
    try {
      setSubmitting(true);
      setError('');
      const response = await axios.post(`/api/payment/public/transactions/${encodeURIComponent(txnCode)}/fail`);
      setTransaction(response.data);
    } catch {
      setError(t('paymentSandboxPage.cancelFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (error && !transaction) {
    return (
      <div className="sandbox-mobile-shell">
        <div className="sandbox-mobile-card sandbox-mobile-card-error">
          <h1>MovieX Sandbox</h1>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sandbox-mobile-shell">
      <div className="sandbox-mobile-card">
        <div className="sandbox-bank-banner">
          <div>
            <p className="sandbox-bank-label">{t('paymentSandboxPage.bankLabel')}</p>
            <h1>{t('paymentSandboxPage.title')}</h1>
          </div>
          <span className={`sandbox-status-chip status-${String(transaction?.status || '').toLowerCase()}`}>
            {transaction?.status || '...'}
          </span>
        </div>

        {error && <div className="sandbox-alert sandbox-alert-error">{error}</div>}

        {transaction && (
          <>
            <section className="sandbox-mobile-summary">
              <p>{t('paymentSandboxPage.virtualAmount')}</p>
              <strong>{formatVnd(transaction.amount)}</strong>
            </section>

            <section className="sandbox-mobile-list">
              <div className="sandbox-mobile-row">
                <span>{t('paymentSandboxPage.receiver')}</span>
                <strong>{transaction.receiverName}</strong>
              </div>
              <div className="sandbox-mobile-row">
                <span>{t('paymentSandboxPage.accountNumber')}</span>
                <strong>{transaction.receiverAccount}</strong>
              </div>
              <div className="sandbox-mobile-row">
                <span>{t('paymentSandboxPage.bank')}</span>
                <strong>{transaction.bankName}</strong>
              </div>
              <div className="sandbox-mobile-row">
                <span>{t('paymentSandboxPage.transferContent')}</span>
                <strong>{transaction.paymentContent}</strong>
              </div>
              <div className="sandbox-mobile-row">
                <span>{t('paymentSandboxPage.txnCode')}</span>
                <strong>{transaction.txnCode}</strong>
              </div>
              <div className="sandbox-mobile-row">
                <span>{t('paymentSandboxPage.note')}</span>
                <strong>{transaction.paymentNote}</strong>
              </div>
            </section>

            {transaction.status === 'SUCCESS' ? (
              <div className="sandbox-complete-state">
                <div className="sandbox-checkmark">✓</div>
                <h2>{t('paymentSandboxPage.successAlready')}</h2>
                <button type="button" className="btn btn-primary sandbox-btn" onClick={() => navigate(`/payment-success/${txnCode}`, { replace: true })}>
                  {t('paymentSandboxPage.viewSuccess')}
                </button>
              </div>
            ) : transaction.status === 'FAILED' ? (
              <div className="sandbox-failed-state">
                <div className="sandbox-crossmark">!</div>
                <h2>{t('paymentSandboxPage.cancelledTitle')}</h2>
                <p>{t('paymentSandboxPage.cancelledCopy')}</p>
              </div>
            ) : (
              <div className="sandbox-actions sandbox-actions-stack">
                <button type="button" className="btn btn-primary sandbox-btn" onClick={handleConfirm} disabled={submitting}>
                  {submitting ? t('paymentSandboxPage.processing') : t('paymentSandboxPage.confirm')}
                </button>
                <button type="button" className="btn btn-outline sandbox-btn" onClick={handleFail} disabled={submitting}>
                  {t('paymentSandboxPage.cancel')}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default PaymentSandboxPage;
