import { useEffect, useMemo, useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { cinemaBranches, cinemaMovies } from '../data/cinemaData';
import { formatCurrency } from '../utils/cinema';

function CinemaCheckout() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    movieId,
    cinemaId,
    showtimeId,
    showDate,
    time,
    auditorium,
    seatIds = [],
    seats = [],
    totalPrice = 0,
  } = location.state || {};

  const movie = cinemaMovies.find((item) => item.id === movieId);
  const cinema = cinemaBranches.find((branch) => branch.id === cinemaId);

  const [bookingSummary, setBookingSummary] = useState(null);
  const [txnCode, setTxnCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReleased, setIsReleased] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

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
          setError(initError?.response?.data?.message || 'Unable to initialize sandbox payment.');
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
  }, [showtimeId, seatIds]);

  const hasValidCheckout = useMemo(() => movie && cinema && showtimeId, [movie, cinema, showtimeId]);

  const handleSimulatePayment = async (success) => {
    if (!txnCode) return;
    try {
      setIsSubmitting(true);
      setError('');
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
        setStatusMessage('Payment succeeded. Seats are booked and tickets are generated.');
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
    navigate('/cinema/tickets');
  };

  if (!hasValidCheckout) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.checkoutTitle')}</p>
            <h1 className="cinema-title">{t('cinema.bookingSummary')}</h1>
            <p className="cinema-subtitle">{cinema.name} - {auditorium}</p>
          </div>
          <Link to="/cinema/seats" className="btn btn-outline">
            {t('cinema.selectSeats')}
          </Link>
        </div>

        <div className="cinema-checkout-grid">
          <div className="cinema-checkout-card">
            <h3>{movie.title}</h3>
            <p>{movie.genre} - {movie.duration}</p>
            <div className="cinema-checkout-row">
              <span>Cinema</span>
              <strong>{cinema.name}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.auditorium')}</span>
              <strong>{auditorium}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>Date</span>
              <strong>{showDate || '-'}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.selectShowtime')}</span>
              <strong>{time}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.seats')}</span>
              <strong>{seats.join(', ') || '-'}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.total')}</span>
              <strong>{formatCurrency(totalPrice || 0)}</strong>
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
                <p>Status: {bookingSummary?.bookingStatus || 'PENDING'}</p>

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
                  className="btn btn-outline"
                  style={{ marginTop: 12 }}
                  disabled={!txnCode || isSubmitting || isConfirmed || isReleased}
                  onClick={() => handleSimulatePayment(false)}
                >
                  Simulate Payment Failure
                </button>

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ marginTop: 12 }}
                  disabled={!bookingSummary?.bookingId || isSubmitting || isConfirmed || isReleased}
                  onClick={handleReleaseBooking}
                >
                  Cancel Checkout and Release Seats
                </button>

                {isConfirmed && (
                  <button type="button" className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleViewTickets}>
                    {t('cinema.navTickets')}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {statusMessage && <p className="muted-text" style={{ marginTop: 12 }}>{statusMessage}</p>}
        {error && <p className="muted-text" style={{ marginTop: 12, color: '#fca5a5' }}>{error}</p>}
      </div>
    </div>
  );
}

export default CinemaCheckout;
