import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import { formatCurrency } from '../utils/cinema';
import { fetchCinemaShowtimeDetail } from '../utils/cinemaApi';

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

        setTxnCode(paymentRes.data.paymentTxnCode || '');
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

  const pricingBreakdown = bookingSummary?.pricingBreakdown || initialPricingBreakdown;
  const summaryMovieTitle = showtime?.movie?.title || movieTitle || pricingBreakdown?.movieTitle || '-';
  const summaryCinemaName = showtime?.cinemaName || cinemaName || pricingBreakdown?.cinemaName || '-';
  const summaryAuditorium = showtime?.auditoriumName || auditoriumName || pricingBreakdown?.auditoriumName || '-';
  const summaryShowDate = showtime?.showDate || showDate || pricingBreakdown?.showDate || '-';
  const summaryTime = showtime?.startTime || time || pricingBreakdown?.startTime || '-';
  const summaryTotal = Number(pricingBreakdown?.total ?? bookingSummary?.totalPrice ?? 0);
  const summarySubtotal = Number(pricingBreakdown?.subtotal ?? summaryTotal);
  const breakdownSeats = Array.isArray(pricingBreakdown?.seats) ? pricingBreakdown.seats : [];
  const hasValidCheckout = Boolean(showtimeId && seatIds.length);

  const handleSimulatePayment = async (success) => {
    if (!txnCode) return;
    try {
      setIsSubmitting(true);
      setError('');
      setStatusMessage('');

      const response = await axios.post('/api/cinema/payments/confirm', null, {
        params: {
          txnCode,
          success,
        },
      });

      const result = response.data;
      setBookingSummary(result);
      if (success) {
        setIsConfirmed(true);
        setStatusMessage(t('cinema.paymentSucceededBookingConfirmedAndTicketGenerated'));
      } else {
        setIsReleased(true);
        setStatusMessage(t('cinema.paymentFailedReservedSeatsReleased'));
      }
    } catch (submitError) {
      setError(submitError?.response?.data?.message || t('cinema.unableToConfirmSandboxPayment'));
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
      setBookingSummary(response.data);
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

        <div className="cinema-checkout-grid">
          <div className="cinema-checkout-card">
            <h3>{summaryMovieTitle}</h3>
            <div className="cinema-checkout-row">
              <span>{t('cinema.cinemaLabel')}</span>
              <strong>{summaryCinemaName}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.auditoriumLabel')}</span>
              <strong>{summaryAuditorium}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.dateLabel')}</span>
              <strong>{summaryShowDate}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.timeLabel')}</span>
              <strong>{summaryTime}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.seats')}</span>
              <strong>{seats.join(', ') || seatIds.join(', ') || '-'}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.total')}</span>
              <strong>{formatCurrency(summaryTotal)}</strong>
            </div>

            <div className="cinema-price-breakdown">
              <div className="cinema-breakdown-header">
                <div>
                  <p className="cinema-breakdown-label">{t('cinema.backendPriceBreakdown')}</p>
                  <h4>{t('cinema.seatBySeatPricing')}</h4>
                </div>
                <span className="cinema-price-chip">{t('cinema.verifiedByServer')}</span>
              </div>

              <div className="cinema-breakdown-meta">
                <div>
                  <span>{t('cinema.movieLabel')}</span>
                  <strong>{summaryMovieTitle}</strong>
                </div>
                <div>
                  <span>{t('cinema.cinemaLabel')}</span>
                  <strong>{summaryCinemaName}</strong>
                </div>
                <div>
                  <span>{t('cinema.auditoriumLabel')}</span>
                  <strong>{summaryAuditorium}</strong>
                </div>
                <div>
                  <span>{t('cinema.dateLabel')}</span>
                  <strong>{summaryShowDate}</strong>
                </div>
                <div>
                  <span>{t('cinema.timeLabel')}</span>
                  <strong>{summaryTime}</strong>
                </div>
              </div>

              {breakdownSeats.length > 0 ? (
                <div className="cinema-breakdown-list">
                  {breakdownSeats.map((line) => (
                    <div key={line.seatId} className="cinema-breakdown-row">
                      <div className="cinema-breakdown-seat">
                        <strong>{line.seatLabel || line.seatId}</strong>
                        <span>
                          {(line.seatType || 'NORMAL').toString()} · {line.pricingRule || t('cinema.basePrice')}
                        </span>
                      </div>
                      <div className="cinema-breakdown-price">
                        <div>
                          <span>{t('cinema.unitPrice')}</span>
                          <strong>{formatCurrency(Number(line.unitPrice || 0))}</strong>
                        </div>
                        <div>
                          <span>{t('cinema.lineTotal')}</span>
                          <strong>{formatCurrency(Number(line.lineTotal || 0))}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cinema-price-note">{t('cinema.preparingPricingDetailsFromBackend')}</p>
              )}

              <div className="cinema-breakdown-total">
                <div>
                  <span>{t('cinema.subtotal')}</span>
                  <strong>{formatCurrency(summarySubtotal)}</strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatCurrency(summaryTotal)}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="cinema-checkout-card accent">
            <h3>{t('cinema.sandboxPayment')}</h3>
            {isInitializing ? (
              <p>{t('cinema.preparingBookingAndPaymentTransaction')}</p>
            ) : (
              <>
                <p>{t('cinema.bookingId')}: {bookingSummary?.bookingId || '-'}</p>
                <p>{t('cinema.transactionCode')}: {txnCode || '-'}</p>
                <p>{t('cinema.bookingStatus')}: {bookingSummary?.bookingStatus || '-'}</p>
                <p>{t('cinema.paymentStatus')}: {bookingSummary?.paymentStatus || '-'}</p>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!txnCode || isSubmitting || isConfirmed || isReleased}
                  onClick={() => handleSimulatePayment(true)}
                >
                  {isSubmitting ? t('cinema.processing') : t('cinema.simulatePaymentSuccess')}
                </button>

                <button
                  type="button"
                  className="btn btn-outline cinema-stack-btn"
                  disabled={!txnCode || isSubmitting || isConfirmed || isReleased}
                  onClick={() => handleSimulatePayment(false)}
                >
                  {t('cinema.simulatePaymentFailure')}
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
                    {t('cinema.navTickets')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {statusMessage && <p className="cinema-note">{statusMessage}</p>}
        {error && <p className="cinema-note cinema-note-error">{error}</p>}
      </div>
    </div>
  );
}

export default CinemaCheckout;

