import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cinemaBranches, cinemaMovies, showtimeCatalog } from '../data/cinemaData';
import {
  expandShowtimeCatalog,
  formatCurrency,
  getTodayWeekIndex,
  getWeekDates,
  loadCustomShowtimes,
  mergeShowtimes,
} from '../utils/cinema';

function CinemaMovieDetail() {
  const { movieId } = useParams();
  const { t } = useTranslation();
  const weekDates = useMemo(() => getWeekDates(), []);
  const todayIndex = useMemo(() => getTodayWeekIndex(), []);
  const movie = cinemaMovies.find((item) => item.id === movieId);
  const baseShowtimes = useMemo(
    () => expandShowtimeCatalog(showtimeCatalog, cinemaMovies, weekDates),
    [weekDates]
  );
  const customShowtimes = useMemo(() => loadCustomShowtimes(), []);
  const showtimes = useMemo(
    () => mergeShowtimes(baseShowtimes, customShowtimes),
    [baseShowtimes, customShowtimes]
  );
  const todayShowtimes = useMemo(
    () => showtimes.filter((showtime) => showtime.movieId === movieId && showtime.dayIndex === todayIndex),
    [showtimes, movieId, todayIndex]
  );

  if (!movie) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <p className="cinema-empty">{t('common.unknownMovie')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-detail-hero">
          <img src={movie.poster} alt={movie.title} />
          <div className="cinema-detail-copy">
            <p className="cinema-section-eyebrow">{movie.genre}</p>
            <h1 className="cinema-title">{movie.title}</h1>
            <p className="cinema-subtitle">{movie.description}</p>
            <div className="cinema-detail-meta">
              <span>{movie.duration}</span>
              <span>{movie.rating}</span>
            </div>
            <div className="cinema-actions">
              <Link to={`/cinema/movie/${movie.id}/showtimes`} className="btn btn-primary">
                {t('cinema.selectShowtime')}
              </Link>
              <Link to="/cinema/now-showing" className="btn btn-outline">
                {t('cinema.navNowShowing')}
              </Link>
            </div>
          </div>
        </div>

        <section className="cinema-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.todayLabel')}</p>
              <h2 className="cinema-section-title">{t('cinema.navNowShowing')}</h2>
            </div>
          </div>
          {todayShowtimes.length === 0 ? (
            <div className="cinema-empty">{t('cinema.noShowtimes')}</div>
          ) : (
            <div className="cinema-showtime-grid">
              {todayShowtimes.map((showtime) => {
                const cinema = cinemaBranches.find((branch) => branch.id === showtime.cinemaId);
                return (
                  <div key={showtime.id} className="cinema-showtime-card">
                    <div>
                      <h3>{cinema?.name}</h3>
                      <p>{cinema?.city} - {showtime.auditorium}</p>
                    </div>
                    <div className="cinema-showtime-times">
                      <Link
                        to={`/cinema/movie/${movie.id}/showtimes`}
                        state={{ cinemaId: showtime.cinemaId, dayIndex: todayIndex, time: showtime.startTime }}
                        className="cinema-time-chip"
                      >
                        {showtime.startTime}
                      </Link>
                      <span className="cinema-time-price">{formatCurrency(showtime.price)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CinemaMovieDetail;
