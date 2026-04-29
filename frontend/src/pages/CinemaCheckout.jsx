import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import CinemaBookingProgress from '../components/CinemaBookingProgress';
import CinemaBookingSummary from '../components/CinemaBookingSummary';
import CinemaModuleNav from '../components/CinemaModuleNav';
import PageTransition from '../components/motion/PageTransition';
import Reveal from '../components/motion/Reveal';
import { useCinemaBooking } from '../context/CinemaBookingContext';
import { buildQrCodeImageUrl } from '../utils/cinema';
import { fetchCinemaPaymentSession, fetchCinemaShowtimeDetail } from '../utils/cinemaApi';

const isPaymentConfirmed = (session = {}) => {
  return session.paymentStatus === 'PAID'
    || session.status === 'PAID'
    || session.bookingStatus === 'CONFIRMED';
};

const isPaymentReleased = (session = {}) => {
  return session.paymentStatus === 'FAILED'
    || session.status === 'FAILED'
    || session.status === 'CANCELLED';
};

function CinemaCheckout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    showtime: bookingShowtime,
    seatIds: bookingSeatIds,
    seatLabels: bookingSeatLabels,
    pricingBreakdown: bookingPricingBreakdown,
    checkoutSession,
    setSelectedShowtime,
    setCheckoutSession,
    resetBooking,
  } = useCinemaBooking();

  const fallbackState = location.state || {};
  const showtimeId = bookingShowtime?.id || fallbackState.showtimeId;
  const seatIds = bookingSeatIds.length ? bookingSeatIds : (fallbackState.seatIds || []);
  const seatLabels = bookingSeatLabels.length ? bookingSeatLabels : (fallbackState.seats || []);
  const fallbackPricingBreakdown = fallbackState.pricingBreakdown || null;

  const [showtime, setShowtime] = useState(bookingShowtime || null);
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

  const persistCheckoutSession = ({
    nextBookingSummary,
    nextTxnCode,
    nextPaymentSession,
    nextIsConfirmed,
    nextIsReleased,
  }) => {
    setCheckoutSession({
      showtimeId,
      seatKey,
      bookingSummary: nextBookingSummary || null,
      txnCode: nextTxnCode || '',
      paymentSession: nextPaymentSession || null,
      isConfirmed: Boolean(nextIsConfirmed),
      isReleased: Boolean(nextIsReleased),
    });
  };

  useEffect(() => {
    let ignore = false;

    const loadShowtime = async () => {
      if (!showtimeId) return;

      if (bookingShowtime?.id === showtimeId) {
        setShowtime(bookingShowtime);
        return;
      }

      try {
        const data = await fetchCinemaShowtimeDetail(showtimeId);
        if (!ignore) {
          setShowtime(data);
          setSelectedShowtime(data);
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
  }, [bookingShowtime, setSelectedShowtime, showtimeId]);

  useEffect(() => {
    let ignore = false;

    const initializeCheckout = async () => {
      if (!showtimeId || !seatIds.length) {
        setError(t('cinema.missingShowtimeOrSeatsForCheckout'));
        setIsInitializing(false);
        return;
      }

      setError('');
      setStatusMessage('');
      setIsInitializing(true);

      const hasReusableSession = checkoutSession
        && checkoutSession.showtimeId === showtimeId
        && checkoutSession.seatKey === seatKey;

      if (hasReusableSession) {
        const restoredBookingSummary = checkoutSession.bookingSummary || null;
        const restoredTxnCode = checkoutSession.txnCode || '';
        const restoredPaymentSession = checkoutSession.paymentSession || null;
        const restoredConfirmed = Boolean(checkoutSession.isConfirmed);
        const restoredReleased = Boolean(checkoutSession.isReleased);

        setBookingSummary(restoredBookingSummary);
        setTxnCode(restoredTxnCode);
        setPaymentSession(restoredPaymentSession);
        setIsConfirmed(restoredConfirmed);
        setIsReleased(restoredReleased);
        setIsInitializing(false);

        if (!restoredTxnCode) {
          return;
        }

        try {
          const refreshedSession = await fetchCinemaPaymentSession(restoredTxnCode);
          if (ignore) return;

          const refreshedConfirmed = isPaymentConfirmed(refreshedSession);
          const refreshedReleased = isPaymentReleased(refreshedSession);
          setPaymentSession(refreshedSession);
          setIsConfirmed(refreshedConfirmed);
          setIsReleased(refreshedReleased);

          setBookingSummary((current) => (current ? {
            ...current,
            bookingStatus: refreshedSession.bookingStatus || current.bookingStatus,
            paymentStatus: refreshedSession.paymentStatus || refreshedSession.status || current.paymentStatus,
          } : current));

          persistCheckoutSession({
            nextBookingSummary: restoredBookingSummary,
            nextTxnCode: restoredTxnCode,
            nextPaymentSession: refreshedSession,
            nextIsConfirmed: refreshedConfirmed,
            nextIsReleased: refreshedReleased,
          });
        } catch {
          // Keep restored state if refresh fails.
        }
        return;
      }

      try {
        const bookingResponse = await axios.post('/api/cinema/bookings', { showtimeId, seatIds });
        if (ignore) return;
        const bookingData = bookingResponse.data || null;
        setBookingSummary(bookingData);

        const paymentResponse = await axios.post('/api/cinema/payments', {
          bookingId: bookingData?.bookingId,
        });
        if (ignore) return;

        const paymentData = paymentResponse.data || bookingData || null;
        const nextTxnCode = paymentData?.paymentTxnCode || '';
        setBookingSummary(paymentData);
        setTxnCode(nextTxnCode);

        let nextPaymentSession = null;
        if (nextTxnCode) {
          try {
            nextPaymentSession = await fetchCinemaPaymentSession(nextTxnCode);
          } catch {
            nextPaymentSession = {
              txnCode: nextTxnCode,
              status: paymentData?.paymentStatus,
              paymentStatus: paymentData?.paymentStatus,
              bookingStatus: paymentData?.bookingStatus,
              bookingId: paymentData?.bookingId,
              paymentPageUrl: paymentData?.paymentPageUrl || '',
            };
          }
        }

        if (ignore) return;

        const nextConfirmed = isPaymentConfirmed(nextPaymentSession || paymentData || {});
        const nextReleased = isPaymentReleased(nextPaymentSession || paymentData || {});
        setPaymentSession(nextPaymentSession);
        setIsConfirmed(nextConfirmed);
        setIsReleased(nextReleased);

        persistCheckoutSession({
          nextBookingSummary: paymentData,
          nextTxnCode,
          nextPaymentSession,
          nextIsConfirmed: nextConfirmed,
          nextIsReleased: nextReleased,
        });
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
  }, [checkoutSession, seatKey, showtimeId, t]);

  const handleRefreshPaymentStatus = async () => {
    if (!txnCode) return;

    try {
      setIsSubmitting(true);
      setError('');
      setStatusMessage('');
      const nextSession = await fetchCinemaPaymentSession(txnCode);
      const nextConfirmed = isPaymentConfirmed(nextSession);
      const nextReleased = isPaymentReleased(nextSession);

      setPaymentSession(nextSession);
      setIsConfirmed(nextConfirmed);
      setIsReleased(nextReleased);

      setBookingSummary((current) => {
        const updated = current ? {
          ...current,
          bookingId: nextSession.bookingId || current.bookingId,
          paymentStatus: nextSession.paymentStatus || nextSession.status || current.paymentStatus,
          bookingStatus: nextSession.bookingStatus || current.bookingStatus,
        } : current;

        persistCheckoutSession({
          nextBookingSummary: updated,
          nextTxnCode: txnCode,
          nextPaymentSession: nextSession,
          nextIsConfirmed: nextConfirmed,
          nextIsReleased: nextReleased,
        });

        return updated;
      });

      if (nextConfirmed) {
        setStatusMessage(t('cinema.paymentCompletedViewYourTicket'));
      } else if (nextReleased) {
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

  const handleReleaseBooking = async () => {
    if (!bookingSummary?.bookingId || isConfirmed) return;
    try {
      setIsSubmitting(true);
      setError('');
      setStatusMessage('');
      const response = await axios.post(`/api/cinema/bookings/${bookingSummary.bookingId}/release`);
      const nextBookingSummary = response.data || null;
      const nextPaymentSession = paymentSession ? {
        ...paymentSession,
        status: nextBookingSummary?.paymentStatus || 'CANCELLED',
        paymentStatus: nextBookingSummary?.paymentStatus || 'CANCELLED',
        bookingStatus: nextBookingSummary?.bookingStatus || 'CANCELLED',
      } : paymentSession;

      setBookingSummary(nextBookingSummary);
      setPaymentSession(nextPaymentSession);
      setIsReleased(true);
      setIsConfirmed(false);
      setStatusMessage(t('cinema.bookingReleasedSeatsAvailableAgain'));

      persistCheckoutSession({
        nextBookingSummary,
        nextTxnCode: txnCode,
        nextPaymentSession,
        nextIsConfirmed: false,
        nextIsReleased: true,
      });
    } catch (releaseError) {
      setError(releaseError?.response?.data?.message || t('cinema.unableToReleaseBooking'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewTickets = () => {
    const targetBookingId = bookingSummary?.bookingId || paymentSession?.bookingId;
    resetBooking();
    if (targetBookingId) {
      navigate(`/cinema/tickets/${targetBookingId}`);
      return;
    }
    navigate('/cinema/tickets');
  };

  const pricingBreakdown = bookingSummary?.pricingBreakdown || bookingPricingBreakdown || fallbackPricingBreakdown;
  const summaryMovieTitle = showtime?.movie?.title || pricingBreakdown?.movieTitle || '-';
  const summaryCinemaName = showtime?.cinemaName || pricingBreakdown?.cinemaName || '-';
  const summaryAuditorium = showtime?.auditoriumName || pricingBreakdown?.auditoriumName || '-';
  const summaryShowDate = showtime?.showDate || pricingBreakdown?.showDate || '-';
  const summaryTime = showtime?.startTime || pricingBreakdown?.startTime || '-';
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

  const renderShell = (content) => (
    <PageTransition as="div" className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        {content}
      </div>
    </PageTransition>
  );

  if (!hasValidCheckout) {
    return renderShell(
      <>
        <p className="cinema-empty">{t('cinema.missingShowtimeOrSeatsForCheckout')}</p>
        <Link to="/cinema/now-showing" className="btn btn-outline">
          {t('cinema.navNowShowing')}
        </Link>
      </>
    );
  }

  return (
    <PageTransition as="div" className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <Reveal delay={10}>
          <CinemaBookingProgress currentStep={isConfirmed ? 'ticket' : 'checkout'} />
        </Reveal>
        <Reveal className="cinema-page-header" delay={30} y={12}>
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.checkoutTitle')}</p>
            <h1 className="cinema-title">{t('cinema.bookingSummary')}</h1>
            <p className="cinema-subtitle">{summaryCinemaName} - {summaryAuditorium}</p>
          </div>
          <Link to="/cinema/seats" className="btn btn-outline">
            {t('cinema.selectSeats')}
          </Link>
        </Reveal>

        <Reveal className="cinema-checkout-layout" delay={50}>
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
                    <button type="button" className="btn btn-primary cinema-stack-btn mx-success-pop" onClick={handleViewTickets}>
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
            selectedSeats={seatLabels.length ? seatLabels : seatIds}
            pricingBreakdown={pricingBreakdown}
            total={summaryTotal}
            subtotal={summarySubtotal}
            isLoadingPrices={isInitializing}
            statusRows={checkoutSummaryStatusRows}
            actionLabel={summaryActionLabel}
            actionDisabled={summaryActionDisabled}
            onAction={handleSummaryAction}
          />
        </Reveal>

        {statusMessage && <p className={`cinema-note${isConfirmed ? ' mx-success-pop' : ''}`}>{statusMessage}</p>}
        {error && <p className="cinema-note cinema-note-error">{error}</p>}
      </div>
    </PageTransition>
  );
}

export default CinemaCheckout;
