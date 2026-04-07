import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cinemaMovies, showtimeCatalog } from '../data/cinemaData';
import {
  expandShowtimeCatalog,
  formatCurrency,
  getNowShowingToday,
  getTodayWeekIndex,
  getWeekDates,
  loadCustomShowtimes,
  mergeShowtimes,
} from '../utils/cinema';

function CinemaNowShowing() {
  const { t } = useTranslation();
  const weekDates = useMemo(() => getWeekDates(), []);
  const todayIndex = useMemo(() => getTodayWeekIndex(), []);
  const baseShowtimes = useMemo(
    () => expandShowtimeCatalog(showtimeCatalog, cinemaMovies, weekDates),
    [weekDates]
  );
  const customShowtimes = useMemo(() => loadCustomShowtimes(), []);
  const showtimes = useMemo(
    () => mergeShowtimes(baseShowtimes, customShowtimes),
    [baseShowtimes, customShowtimes]
  );
  const nowShowing = useMemo(
    () => getNowShowingToday(showtimes, cinemaMovies, todayIndex),
    [showtimes, todayIndex]
  );

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.todayLabel')}</p>
            <h1 className="cinema-title">{t('cinema.navNowShowing')}</h1>
            <p className="cinema-subtitle">{t('cinema.selectShowtime')}</p>
          </div>
          <Link to="/cinema/schedule" className="btn btn-outline">
            {t('cinema.navSchedule')}
          </Link>
        </div>

        <div className="cinema-grid">
          {nowShowing.map(({ movie, firstShowtime }) => (
            <div key={movie.id} className="cinema-card-item">
              <img src={movie.poster} alt={movie.title} className="cinema-card-poster" />
              <div className="cinema-card-body">
                <h3>{movie.title}</h3>
                <p>{movie.genre} - {movie.duration}</p>
                <div className="cinema-card-actions">
                  <span className="cinema-pill">
                    {firstShowtime
                      ? `${formatCurrency(firstShowtime.price)} - ${firstShowtime.startTime}`
                      : t('cinema.noShowtimes')}
                  </span>
                  <Link to={`/cinema/movie/${movie.id}`} className="btn btn-primary cinema-compact-btn">
                    {t('cinema.ctaSelectSeats')}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CinemaNowShowing;
