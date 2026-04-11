import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import CinemaBookingProgress from '../components/CinemaBookingProgress';
import CinemaBookingSummary from '../components/CinemaBookingSummary';
import CinemaModuleNav from '../components/CinemaModuleNav';
import { buildQrCodeImageUrl } from '../utils/cinema';
import { fetchCinemaPaymentSession, fetchCinemaShowtimeDetail } from '../utils/cinemaApi';

function CinemaCheckout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const {
    showtimeId,
    seatIds = [],
    seats = [],
    movieTitle,
    cinemaName,
    auditoriumName,
    showDate,
    time,
    pricingBreakdown: initialPricingBreakdown = null,
  } = location.state || {};

  const [showtime, setShowtime] = useState(null);
  const [bookingSummary, setBookingSummary] = useState(null);
  const [txnCode, setTxnCode] = useState('');
  const [paymentSession, setPaymentSession] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const seatKey = useMemo(() => seatIds.join('|'), [seatIds]);

  useEffect(() => {
    let ignore = false;

    const loadShowtime = async () => {
      if (!showtimeId) return;
      try {
        const data = await fetchCinemaShowtimeDetail(showtimeId);
        if (!ignore) {
          setShowtime(data);
        }
      } catch {
        if (!ignore) {
          setShowtime(null);
        }
      }
    };

    loadShowtime();
    return () => {
      ignore = true;
    };
  }, [showtimeId]);

  useEffect(() => {
    let ignore = false;

    const initializeCheckout = async () => {
      if (!showtimeId || !seatIds.length) {
        setError(t('cinema.missingShowtimeOrSeatsForCheckout'));
        setIsInitializing(false);
        return;
      }

      try {
        setError('');
        setStatusMessage('');

        const bookingRes = await axios.post('/api/cinema/bookings', {
          showtimeId,
          seatIds,
        });

        const booking = bookingRes.data;
        if (ignore) return;

        setBookingSummary(booking);

        const paymentRes = await axios.post('/api/cinema/payments', {
          bookingId: booking.bookingId,
        });
        if (ignore) return;

        const paymentData = paymentRes.data || {};
        const nextTxnCode = paymentData.paymentTxnCode || '';
        setBookingSummary(paymentData);
        setTxnCode(nextTxnCode);

        if (nextTxnCode) {
          try {
            const session = await fetchCinemaPaymentSession(nextTxnCode);
            if (!ignore) {
              setPaymentSession(session);
              if (session.paymentStatus === 'PAID' || session.status === 'PAID' || session.bookingStatus === 'CONFIRMED') {
                setIsConfirmed(true);
              }
              if (session.paymentStatus === 'FAILED' || session.status === 'FAILED' || session.status === 'CANCELLED') {
                setIsReleased(true);
              }
            }
          } catch {
            if (!ignore) {
              setPaymentSession({
                txnCode: nextTxnCode,
                status: paymentData.paymentStatus,
                paymentStatus: paymentData.paymentStatus,
                bookingStatus: paymentData.bookingStatus,
                bookingId: paymentData.bookingId,
                paymentPageUrl: paymentData.paymentPageUrl || '',
              });
            }
          }
        }
      } catch (initError) {
        if (!ignore) {
          setError(initError?.response?.data?.message || t('cinema.createSandboxPaymentTransactionFailed'));
        }
      } finally {
        if (!ignore) {
          setIsInitializing(false);
        }
      }
    };

    initializeCheckout();

    return () => {
      ignore = true;
    };
  }, [showtimeId, seatKey]);

  const handleRefreshPaymentStatus = async () => {
    if (!txnCode) return;

    try {
      setIsSubmitting(true);
      setError('');
      setStatusMessage('');
      const session = await fetchCinemaPaymentSession(txnCode);
      setPaymentSession(session);

      setBookingSummary((current) => (current ? {
        ...current,
        bookingId: session.bookingId || current.bookingId,
        paymentStatus: session.paymentStatus || session.status || current.paymentStatus,
        bookingStatus: session.bookingStatus || current.bookingStatus,
      } : current));

      if (session.paymentStatus === 'PAID' || session.status === 'PAID' || session.bookingStatus === 'CONFIRMED') {
        setIsConfirmed(true);
        setIsReleased(false);
        setStatusMessage(t('cinema.paymentCompletedViewYourTicket'));
      } else if (session.paymentStatus === 'FAILED' || session.status === 'FAILED' || session.status === 'CANCELLED') {
        setIsReleased(true);
        setIsConfirmed(false);
        setStatusMessage(t('cinema.paymentFailedReservedSeatsReleased'));
      } else {
        setStatusMessage(t('cinema.paymentIsStillPending'));
      }
    } catch (refreshError) {
      setError(refreshError?.response?.data?.message || t('cinema.unableToLoadPaymentStatus'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pricingBreakdown = bookingSummary?.pricingBreakdown || initialPricingBreakdown;
  const summaryMovieTitle = showtime?.movie?.title || movieTitle || pricingBreakdown?.movieTitle || '-';
  const summaryCinemaName = showtime?.cinemaName || cinemaName || pricingBreakdown?.cinemaName || '-';
  const summaryAuditorium = showtime?.auditoriumName || auditoriumName || pricingBreakdown?.auditoriumName || '-';
  const summaryShowDate = showtime?.showDate || showDate || pricingBreakdown?.showDate || '-';
  const summaryTime = showtime?.startTime || time || pricingBreakdown?.startTime || '-';
  const summaryTotal = Number(pricingBreakdown?.total ?? bookingSummary?.totalPrice ?? 0);
  const summarySubtotal = Number(pricingBreakdown?.subtotal ?? summaryTotal);
  const hasValidCheckout = Boolean(showtimeId && seatIds.length);
  const paymentPageUrl = paymentSession?.paymentPageUrl || bookingSummary?.paymentPageUrl || '';
  const paymentQrUrl = buildQrCodeImageUrl(paymentPageUrl, 260);
  const paymentStatus = paymentSession?.status || paymentSession?.paymentStatus || bookingSummary?.paymentStatus || '-';
  const bookingStatus = paymentSession?.bookingStatus || bookingSummary?.bookingStatus || '-';
  const checkoutSummaryStatusRows = [
    { label: t('cinema.transactionCode'), value: txnCode },
    { label: t('cinema.bookingStatus'), value: bookingStatus },
    { label: t('cinema.paymentStatus'), value: paymentStatus },
  ];
  const summaryActionLabel = isConfirmed ? t('cinema.viewMyTicket') : t('cinema.openSandboxPaymentPage');
  const summaryActionDisabled = !isConfirmed && !paymentPageUrl;

  const handleSummaryAction = () => {
    if (isConfirmed) {
      handleViewTickets();
      return;
    }
    if (paymentPageUrl) {
      window.open(paymentPageUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleReleaseBooking = async () => {
    if (!bookingSummary?.bookingId || isConfirmed) return;
    try {
      setIsSubmitting(true);
      setError('');
      setStatusMessage('');
      const response = await axios.post(`/api/cinema/bookings/${bookingSummary.bookingId}/release`);
      setBookingSummary(response.data);
      setPaymentSession((current) => (current ? {
        ...current,
        status: response.data?.paymentStatus || 'CANCELLED',
        paymentStatus: response.data?.paymentStatus || 'CANCELLED',
        bookingStatus: response.data?.bookingStatus || 'CANCELLED',
      } : current));
      setIsReleased(true);
      setStatusMessage(t('cinema.bookingReleasedSeatsAvailableAgain'));
    } catch (releaseError) {
      setError(releaseError?.response?.data?.message || t('cinema.unableToReleaseBooking'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTickets = () => {
    if (bookingSummary?.bookingId) {
      navigate(`/cinema/tickets/${bookingSummary.bookingId}`);
      return;
    }
    navigate('/cinema/tickets');
  };

  if (!hasValidCheckout) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
          <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <CinemaBookingProgress currentStep={isConfirmed ? 'ticket' : 'checkout'} />
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.checkoutTitle')}</p>
            <h1 className="cinema-title">{t('cinema.bookingSummary')}</h1>
            <p className="cinema-subtitle">{summaryCinemaName} - {summaryAuditorium}</p>
          </div>
          <Link to="/cinema/seats" state={{ showtimeId }} className="btn btn-outline">
            {t('cinema.selectSeats')}
          </Link>
        </div>

        <div className="cinema-checkout-layout">
          <div className="cinema-checkout-main">
            <div className="cinema-checkout-card accent cinema-payment-card">
            <h3>{t('cinema.sandboxPayment')}</h3>
            {isInitializing ? (
              <p>{t('cinema.preparingBookingAndPaymentTransaction')}</p>
            ) : (
              <>
                <p>{t('cinema.bookingId')}: {bookingSummary?.bookingId || '-'}</p>
                <p>{t('cinema.transactionCode')}: {txnCode || '-'}</p>
                <p>{t('cinema.bookingStatus')}: {bookingStatus}</p>
                <p>{t('cinema.paymentStatus')}: {paymentStatus}</p>

                {paymentQrUrl ? (
                  <>
                    <div className="cinema-ticket-qr-shell">
                      <img
                        className="cinema-ticket-qr"
                        src={paymentQrUrl}
                        alt={t('cinema.paymentQrAlt', { txnCode: txnCode || '-' })}
                        loading="lazy"
                      />
                    </div>
                    <p className="cinema-price-note">{t('cinema.paymentQrOnlyForPendingPayments')}</p>
                    <p className="cinema-price-note">{t('cinema.paymentQrOpensSandboxPage')}</p>
                  </>
                ) : (
                  <p className="cinema-price-note">{t('cinema.paymentQrUnavailable')}</p>
                )}

                <button
                  type="button"
                  className="btn btn-outline cinema-stack-btn"
                  disabled={!txnCode || isSubmitting}
                  onClick={handleRefreshPaymentStatus}
                >
                  {isSubmitting ? t('cinema.processing') : t('cinema.refreshPaymentStatus')}
                </button>

                <button
                  type="button"
                  className="btn btn-outline cinema-stack-btn"
                  disabled={!bookingSummary?.bookingId || isSubmitting || isConfirmed || isReleased}
                  onClick={handleReleaseBooking}
                >
                  {t('cinema.cancelCheckoutAndReleaseSeats')}
                </button>

                {isConfirmed && (
                  <button type="button" className="btn btn-primary cinema-stack-btn" onClick={handleViewTickets}>
                    {t('cinema.viewMyTicket')}
                  </button>
                )}
              </>
            )}
            </div>
          </div>

          <CinemaBookingSummary
            movieTitle={summaryMovieTitle}
            cinemaName={summaryCinemaName}
            auditoriumName={summaryAuditorium}
            showDate={summaryShowDate}
            time={summaryTime}
            selectedSeats={seats.length ? seats : seatIds}
            pricingBreakdown={pricingBreakdown}
            total={summaryTotal}
            subtotal={summarySubtotal}
            isLoadingPrices={isInitializing}
            statusRows={checkoutSummaryStatusRows}
            actionLabel={summaryActionLabel}
            actionDisabled={summaryActionDisabled}
            onAction={handleSummaryAction}
          />
        </div>

        {statusMessage && <p className="cinema-note">{statusMessage}</p>}
        {error && <p className="cinema-note cinema-note-error">{error}</p>}
      </div>
    </div>
  );
}

export default CinemaCheckout;

