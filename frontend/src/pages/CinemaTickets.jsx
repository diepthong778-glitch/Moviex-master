import { useTranslation } from 'react-i18next';
import { bookingHistory, cinemaBranches, cinemaMovies } from '../data/cinemaData';
import { formatCurrency } from '../utils/cinema';

function CinemaTickets() {
  const { t } = useTranslation();

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.navTickets')}</p>
            <h1 className="cinema-title">{t('cinema.navTickets')}</h1>
            <p className="cinema-subtitle">{t('cinema.bookingSummary')}</p>
          </div>
        </div>

        <div className="cinema-ticket-grid">
          {bookingHistory.map((booking) => {
            const movie = cinemaMovies.find((item) => item.id === booking.movieId);
            const cinema = cinemaBranches.find((branch) => branch.id === booking.cinemaId);
            return (
              <div key={booking.id} className="cinema-ticket-card">
                <div className="cinema-ticket-head">
                  <h3>{movie?.title}</h3>
                  <span>{booking.status}</span>
                </div>
                <p>{cinema?.name}</p>
                <p>{booking.showtime}</p>
                <p>{t('cinema.seats')}: {booking.seats.join(', ')}</p>
                <strong>{formatCurrency(booking.total)}</strong>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default CinemaTickets;
