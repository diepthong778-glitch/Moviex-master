import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { cinemaBranches, cinemaMovies, showtimeCatalog } from '../data/cinemaData';
import {
  buildWeeklySchedule,
  expandShowtimeCatalog,
  formatCurrency,
  getNowShowingToday,
  getTodayWeekIndex,
  getWeekDates,
  loadCustomShowtimes,
  mergeShowtimes,
} from '../utils/cinema';

function CinemaHome() {
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
  const weeklySchedule = useMemo(
    () => buildWeeklySchedule(showtimes, cinemaMovies, cinemaBranches, weekDates),
    [showtimes, weekDates]
  );

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-hero">
          <div className="cinema-hero-copy">
            <span className="cinema-badge">{t('cinemaPage.badge')}</span>
            <h1 className="cinema-title">{t('cinemaPage.title')}</h1>
            <p className="cinema-subtitle">{t('cinemaPage.subtitle')}</p>
            <ul className="cinema-highlights">
              <li>{t('cinemaPage.highlights.one')}</li>
              <li>{t('cinemaPage.highlights.two')}</li>
              <li>{t('cinemaPage.highlights.three')}</li>
            </ul>
            <div className="cinema-actions">
              <Link to="/cinema/now-showing" className="btn btn-primary">
                {t('cinema.ctaBrowseMovies')}
              </Link>
              <Link to="/cinema/schedule" className="btn btn-outline">
                {t('cinema.navSchedule')}
              </Link>
            </div>
          </div>
          <div className="cinema-card">
            <div>
              <p className="cinema-card-label">{t('cinemaPage.cardLabel')}</p>
              <h2 className="cinema-card-title">{t('cinemaPage.cardTitle')}</h2>
              <p className="cinema-card-copy">{t('cinemaPage.cardCopy')}</p>
            </div>
            <div className="cinema-card-meta">
              <div>
                <span>{t('cinemaPage.cardMetaOneLabel')}</span>
                <strong>{t('cinemaPage.cardMetaOneValue')}</strong>
              </div>
              <div>
                <span>{t('cinemaPage.cardMetaTwoLabel')}</span>
                <strong>{t('cinemaPage.cardMetaTwoValue')}</strong>
              </div>
              <div>
                <span>{t('cinemaPage.cardMetaThreeLabel')}</span>
                <strong>{t('cinemaPage.cardMetaThreeValue')}</strong>
              </div>
            </div>
          </div>
        </div>

        <section className="cinema-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.todayLabel')}</p>
              <h2 className="cinema-section-title">{t('cinema.navNowShowing')}</h2>
            </div>
            <Link to="/cinema/now-showing" className="btn btn-outline cinema-link-btn">
              {t('cinema.navNowShowing')}
            </Link>
          </div>
          {nowShowing.length === 0 ? (
            <div className="cinema-empty">{t('cinema.noShowtimes')}</div>
          ) : (
            <div className="cinema-grid">
              {nowShowing.map(({ movie, firstShowtime }) => (
                <Link key={movie.id} to={`/cinema/movie/${movie.id}`} className="cinema-card-item">
                  <img src={movie.poster} alt={movie.title} className="cinema-card-poster" />
                  <div className="cinema-card-body">
                    <h3>{movie.title}</h3>
                    <p>{movie.genre} - {movie.duration}</p>
                    <span className="cinema-pill">
                      {firstShowtime
                        ? `${formatCurrency(firstShowtime.price)} - ${firstShowtime.startTime}`
                        : t('cinema.noShowtimes')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="cinema-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.weeklySchedule')}</p>
              <h2 className="cinema-section-title">{t('cinema.weeklySchedule')}</h2>
            </div>
            <Link to="/cinema/schedule" className="btn btn-outline cinema-link-btn">
              {t('cinema.navSchedule')}
            </Link>
          </div>
          <div className="cinema-weekly-grid">
            {weeklySchedule.map((day) => (
              <div key={day.key} className="cinema-weekly-card">
                <div className="cinema-weekly-head">
                  <strong>{day.label}</strong>
                  <span>{day.isToday ? t('cinema.todayLabel') : ''}</span>
                </div>
                {day.movies.length === 0 ? (
                  <p className="cinema-weekly-empty">{t('cinema.noShowtimes')}</p>
                ) : (
                  <div className="cinema-weekly-list">
                    {day.movies.map((item) => (
                      <Link
                        key={item.movie?.id}
                        to={`/cinema/movie/${item.movie?.id}`}
                        className="cinema-weekly-movie"
                      >
                        <span>{item.movie?.title}</span>
                        <em>{item.entries[0]?.times?.[0] || '-'}</em>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="cinema-section cinema-branch-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.navLocations')}</p>
              <h2 className="cinema-section-title">{t('cinema.navLocations')}</h2>
            </div>
            <Link to="/cinema/locations" className="btn btn-outline cinema-link-btn">
              {t('cinema.navLocations')}
            </Link>
          </div>
          <div className="cinema-branch-grid">
            {cinemaBranches.map((branch) => (
              <div key={branch.id} className="cinema-branch-card">
                <h3>{branch.name}</h3>
                <p>{branch.address}</p>
                <span>{branch.city}</span>
                <div className="cinema-branch-tags">
                  {branch.features.map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default CinemaHome;
