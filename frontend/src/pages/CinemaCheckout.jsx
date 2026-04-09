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
        setError('Missing showtime or seats for checkout.');
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
          setError(initError?.response?.data?.message || 'Failed to create sandbox payment transaction. Please try again.');
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
        setStatusMessage('Payment succeeded. Booking confirmed and ticket generated.');
      } else {
        setIsReleased(true);
        setStatusMessage('Payment failed. Reserved seats were released.');
      }
    } catch (submitError) {
      setError(submitError?.response?.data?.message || 'Unable to confirm sandbox payment.');
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
      setStatusMessage('Booking released. Seats are available again.');
    } catch (releaseError) {
      setError(releaseError?.response?.data?.message || 'Unable to release booking.');
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
              <span>Cinema</span>
              <strong>{summaryCinemaName}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.auditorium')}</span>
              <strong>{summaryAuditorium}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>Date</span>
              <strong>{summaryShowDate}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.selectShowtime')}</span>
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
                  <p className="cinema-breakdown-label">Backend price breakdown</p>
                  <h4>Seat-by-seat pricing</h4>
                </div>
                <span className="cinema-price-chip">Verified by server</span>
              </div>

              <div className="cinema-breakdown-meta">
                <div>
                  <span>Movie</span>
                  <strong>{summaryMovieTitle}</strong>
                </div>
                <div>
                  <span>Cinema</span>
                  <strong>{summaryCinemaName}</strong>
                </div>
                <div>
                  <span>{t('cinema.auditorium')}</span>
                  <strong>{summaryAuditorium}</strong>
                </div>
                <div>
                  <span>Date</span>
                  <strong>{summaryShowDate}</strong>
                </div>
                <div>
                  <span>{t('cinema.selectShowtime')}</span>
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
                          {(line.seatType || 'NORMAL').toString()} · {line.pricingRule || 'Base price'}
                        </span>
                      </div>
                      <div className="cinema-breakdown-price">
                        <div>
                          <span>Unit price</span>
                          <strong>{formatCurrency(Number(line.unitPrice || 0))}</strong>
                        </div>
                        <div>
                          <span>Line total</span>
                          <strong>{formatCurrency(Number(line.lineTotal || 0))}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="cinema-price-note">Preparing pricing details from the backend...</p>
              )}

              <div className="cinema-breakdown-total">
                <div>
                  <span>Subtotal</span>
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
            <h3>Sandbox Payment</h3>
            {isInitializing ? (
              <p>Preparing booking and payment transaction...</p>
            ) : (
              <>
                <p>Booking ID: {bookingSummary?.bookingId || '-'}</p>
                <p>Transaction Code: {txnCode || '-'}</p>
                <p>Booking Status: {bookingSummary?.bookingStatus || '-'}</p>
                <p>Payment Status: {bookingSummary?.paymentStatus || '-'}</p>

                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!txnCode || isSubmitting || isConfirmed || isReleased}
                  onClick={() => handleSimulatePayment(true)}
                >
                  {isSubmitting ? 'Processing...' : 'Simulate Payment Success'}
                </button>

                <button
                  type="button"
                  className="btn btn-outline cinema-stack-btn"
                  disabled={!txnCode || isSubmitting || isConfirmed || isReleased}
                  onClick={() => handleSimulatePayment(false)}
                >
                  Simulate Payment Failure
                </button>

                <button
                  type="button"
                  className="btn btn-outline cinema-stack-btn"
                  disabled={!bookingSummary?.bookingId || isSubmitting || isConfirmed || isReleased}
                  onClick={handleReleaseBooking}
                >
                  Cancel Checkout and Release Seats
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
