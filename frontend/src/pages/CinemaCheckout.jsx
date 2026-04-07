import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cinemaBranches, cinemaMovies } from '../data/cinemaData';
import { formatCurrency } from '../utils/cinema';

function CinemaCheckout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { movieId, cinemaId, time, auditorium, seats, totalPrice } = location.state || {};
  const movie = cinemaMovies.find((item) => item.id === movieId);
  const cinema = cinemaBranches.find((branch) => branch.id === cinemaId);

  if (!movie || !cinema) {
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
              <span>{t('cinema.selectShowtime')}</span>
              <strong>{time}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.seats')}</span>
              <strong>{seats?.join(', ') || '-'}</strong>
            </div>
            <div className="cinema-checkout-row">
              <span>{t('cinema.total')}</span>
              <strong>{formatCurrency(totalPrice || 0)}</strong>
            </div>
          </div>
          <div className="cinema-checkout-card accent">
            <h3>{t('cinema.checkoutTitle')}</h3>
            <p>{t('cinema.confirm')}</p>
            <button type="button" className="btn btn-primary">
              {t('cinema.confirm')}
            </button>
            <Link to="/cinema/tickets" className="cinema-link">
              {t('cinema.navTickets')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CinemaCheckout;
