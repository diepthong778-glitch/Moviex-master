import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import { buildQrCodeImageUrl, formatCurrency } from '../utils/cinema';

function CinemaPaymentSandboxPage() {
  const { t } = useTranslation();
  const { txnCode } = useParams();
  const navigate = useNavigate();
  const [paymentSession, setPaymentSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadPaymentSession = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await axios.get(`/api/cinema/payments/public/transactions/${encodeURIComponent(txnCode)}`);
        if (!ignore) {
          setPaymentSession(response.data || null);
        }
      } catch (loadError) {
        if (!ignore) {
          setError(loadError?.response?.data?.message || t('cinema.cinemaPaymentSessionNotFound'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadPaymentSession();
    return () => {
      ignore = true;
    };
  }, [t, txnCode]);

  const handleDecision = async (success) => {
    try {
      setSubmitting(true);
      setError('');
      const endpoint = success
        ? `/api/cinema/payments/public/transactions/${encodeURIComponent(txnCode)}/confirm`
        : `/api/cinema/payments/public/transactions/${encodeURIComponent(txnCode)}/fail`;
      const response = await axios.post(endpoint);
      const nextSession = response.data || null;
      setPaymentSession(nextSession);

      if (success && nextSession?.bookingId) {
        window.setTimeout(() => {
          navigate(`/cinema/tickets/${nextSession.bookingId}`, { replace: true });
        }, 900);
      }
    } catch (submitError) {
      setError(submitError?.response?.data?.message || t('cinema.unableToConfirmSandboxPayment'));
    } finally {
      setSubmitting(false);
    }
  };

  const paymentQrImageUrl = useMemo(() => {
    return buildQrCodeImageUrl(paymentSession?.paymentPageUrl, 280);
  }, [paymentSession?.paymentPageUrl]);

  const isPaid = paymentSession?.status === 'PAID' || paymentSession?.paymentStatus === 'PAID';
  const isFailed = paymentSession?.status === 'FAILED' || paymentSession?.status === 'CANCELLED';

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.sandboxPayment')}</p>
            <h1 className="cinema-title">{t('cinema.paymentQrTitle')}</h1>
            <p className="cinema-subtitle">{t('cinema.paymentQrSubtitle')}</p>
          </div>
          <Link to="/cinema" className="btn btn-outline">
            {t('common.previous')}
          </Link>
        </div>

        {loading ? (
          <p className="cinema-empty">{t('common.loading')}</p>
        ) : error && !paymentSession ? (
          <p className="cinema-empty">{error}</p>
        ) : !paymentSession ? (
          <p className="cinema-empty">{t('cinema.cinemaPaymentSessionNotFound')}</p>
        ) : (
          <div className="cinema-ticket-detail-grid">
            <div className="cinema-checkout-card">
              <h3>{paymentSession.movieTitle || t('common.unknownMovie')}</h3>
              <p>{paymentSession.bookingCode || paymentSession.bookingId || '-'}</p>
              <div className="cinema-checkout-row">
                <span>{t('cinema.transactionCode')}</span>
                <strong>{paymentSession.txnCode || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.cinemaLabel')}</span>
                <strong>{paymentSession.cinemaName || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.auditoriumLabel')}</span>
                <strong>{paymentSession.auditoriumName || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.dateLabel')}</span>
                <strong>{paymentSession.showDate || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.timeLabel')}</span>
                <strong>{paymentSession.startTime || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.seats')}</span>
                <strong>{Array.isArray(paymentSession.seats) && paymentSession.seats.length ? paymentSession.seats.join(', ') : '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.total')}</span>
                <strong>{formatCurrency(paymentSession.amount || 0)}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.paymentStatus')}</span>
                <strong>{paymentSession.status || paymentSession.paymentStatus || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.bookingStatus')}</span>
                <strong>{paymentSession.bookingStatus || '-'}</strong>
              </div>
              {paymentSession.paymentPageUrl && (
                <div className="cinema-checkout-row cinema-checkout-row-wrap">
                  <span>{t('cinema.paymentPageUrl')}</span>
                  <strong className="cinema-validation-url">{paymentSession.paymentPageUrl}</strong>
                </div>
              )}
            </div>

            <div className="cinema-checkout-card accent">
              <h3>{t('cinema.paymentQrCardTitle')}</h3>
              {paymentQrImageUrl ? (
                <>
                  <div className="cinema-ticket-qr-shell">
                    <img
                      className="cinema-ticket-qr"
                      src={paymentQrImageUrl}
                      alt={t('cinema.paymentQrAlt', { txnCode: paymentSession.txnCode || txnCode })}
                      loading="lazy"
                    />
                  </div>
                  <p className="cinema-price-note">{t('cinema.paymentQrOnlyForPendingPayments')}</p>
                  <p className="cinema-price-note">{t('cinema.paymentQrOpensSandboxPage')}</p>
                </>
              ) : (
                <p className="cinema-empty">{t('cinema.paymentQrUnavailable')}</p>
              )}

              {error && <p className="cinema-note cinema-note-error">{error}</p>}

              {isPaid ? (
                <button
                  type="button"
                  className="btn btn-primary cinema-stack-btn"
                  onClick={() => navigate(`/cinema/tickets/${paymentSession.bookingId}`)}
                >
                  {t('cinema.viewMyTicket')}
                </button>
              ) : isFailed ? (
                <p className="cinema-note">{t('cinema.paymentFailedReservedSeatsReleased')}</p>
              ) : (
                <div className="sandbox-actions sandbox-actions-stack">
                  <button
                    type="button"
                    className="btn btn-primary sandbox-btn"
                    onClick={() => handleDecision(true)}
                    disabled={submitting}
                  >
                    {submitting ? t('cinema.processing') : t('cinema.confirmSandboxPayment')}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline sandbox-btn"
                    onClick={() => handleDecision(false)}
                    disabled={submitting}
                  >
                    {t('cinema.failSandboxPayment')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CinemaPaymentSandboxPage;
