import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import { formatCurrency, formatShortDate, getWeekDates } from '../utils/cinema';
import {
  DEFAULT_CINEMA_POSTER_URL,
  fetchCinemas,
  fetchCinemaShowtimes,
  filterShowtimesByWeek,
  getTodayIsoDate,
  isoDateFromWeekDate,
} from '../utils/cinemaApi';

function CinemaHome() {
  const { t, i18n } = useTranslation();
  const [showtimes, setShowtimes] = useState([]);
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const locale = i18n.language || 'en-US';
  const weekDates = useMemo(
    () => getWeekDates([
      t('cinema.weekdayMonday'),
      t('cinema.weekdayTuesday'),
      t('cinema.weekdayWednesday'),
      t('cinema.weekdayThursday'),
      t('cinema.weekdayFriday'),
      t('cinema.weekdaySaturday'),
      t('cinema.weekdaySunday'),
    ]),
    [i18n.language]
  );
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [cinemaList, showtimeList] = await Promise.all([
          fetchCinemas(),
          fetchCinemaShowtimes(),
        ]);
        if (ignore) return;
        setCinemas(cinemaList);
        setShowtimes(showtimeList);
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || t('cinema.loadScheduleFailed'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const weeklyShowtimes = useMemo(
    () => filterShowtimesByWeek(showtimes, weekDates),
    [showtimes, weekDates]
  );

  const todayShowtimes = useMemo(
    () => weeklyShowtimes.filter((showtime) => showtime.showDate === todayIso),
    [weeklyShowtimes, todayIso]
  );

  const nowShowing = useMemo(() => {
    const grouped = new Map();

    todayShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.movieId)) {
        grouped.set(showtime.movieId, []);
      }
      grouped.get(showtime.movieId).push(showtime);
    });

    return Array.from(grouped.values())
      .map((entries) => {
        const sortedEntries = entries.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
        const branches = Array.from(new Set(sortedEntries.map((entry) => `${entry.cinemaName} (${entry.cinemaCity})`)));
        return {
          movie: sortedEntries[0].movie,
          firstShowtime: sortedEntries[0],
          times: sortedEntries.map((entry) => entry.startTime),
          showtimeCount: sortedEntries.length,
          cinemaCount: new Set(sortedEntries.map((entry) => entry.cinemaId)).size,
          branches,
        };
      })
      .sort((a, b) => a.firstShowtime.startTime.localeCompare(b.firstShowtime.startTime));
  }, [todayShowtimes]);

  const weeklySchedule = useMemo(() => {
    return weekDates.map((day) => {
      const dayIso = isoDateFromWeekDate(day.date);
      const dayShowtimes = weeklyShowtimes.filter((showtime) => showtime.showDate === dayIso);
      const groupedByMovie = new Map();

      dayShowtimes.forEach((showtime) => {
        if (!groupedByMovie.has(showtime.movieId)) {
          groupedByMovie.set(showtime.movieId, []);
        }
        groupedByMovie.get(showtime.movieId).push(showtime);
      });

      const movies = Array.from(groupedByMovie.values())
        .map((entries) => {
          const sortedEntries = entries.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
          return {
            movie: sortedEntries[0].movie,
            firstTime: sortedEntries[0]?.startTime || '-',
            showtimeCount: sortedEntries.length,
            cinemaCount: new Set(sortedEntries.map((item) => item.cinemaId)).size,
          };
        })
        .sort((a, b) => b.showtimeCount - a.showtimeCount);

      return {
        ...day,
        movies,
        showtimeCount: dayShowtimes.length,
        movieCount: movies.length,
      };
    });
  }, [weekDates, weeklyShowtimes]);

  const weeklyMovieCount = useMemo(
    () => new Set(weeklyShowtimes.map((showtime) => showtime.movieId)).size,
    [weeklyShowtimes]
  );

  const spotlight = nowShowing[0] || null;

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />

        <section className="cinema-home-hero">
          <div className="cinema-hero-panel cinema-hero-panel-primary">
            <span className="cinema-badge">{t('cinemaPage.badge')}</span>
            <h1 className="cinema-title">{t('cinemaPage.title')}</h1>
            <p className="cinema-subtitle">{t('cinema.homeSubtitle')}</p>
            <div className="cinema-actions">
              <Link to="/cinema/now-showing" className="btn btn-primary">
                {t('cinema.ctaBrowseMovies')}
              </Link>
              <Link to="/cinema/schedule" className="btn btn-outline">
                {t('cinema.navSchedule')}
              </Link>
              <Link to="/cinema/locations" className="btn btn-outline">
                {t('cinema.navLocations')}
              </Link>
            </div>

            <ol className="cinema-flow-list" aria-label={t('cinema.homeBookingAria')}>
              <li><span>1</span><p>{t('cinema.bookingStepOne')}</p></li>
              <li><span>2</span><p>{t('cinema.bookingStepTwo')}</p></li>
              <li><span>3</span><p>{t('cinema.bookingStepThree')}</p></li>
            </ol>
          </div>

          <div className="cinema-hero-panel cinema-hero-panel-secondary">
            <p className="cinema-card-label">{t('cinema.cinemaSnapshot')}</p>
            <div className="cinema-kpi-grid">
              <div className="cinema-kpi-card">
                <span>{t('cinema.todayMovies')}</span>
                <strong>{nowShowing.length}</strong>
              </div>
              <div className="cinema-kpi-card">
                <span>{t('cinema.todayShows')}</span>
                <strong>{todayShowtimes.length}</strong>
              </div>
              <div className="cinema-kpi-card">
                <span>{t('cinema.thisWeekMovies')}</span>
                <strong>{weeklyMovieCount}</strong>
              </div>
              <div className="cinema-kpi-card">
                <span>{t('cinema.branches')}</span>
                <strong>{cinemas.length}</strong>
              </div>
            </div>

            {spotlight && (
              <div className="cinema-spotlight">
                <p className="cinema-info-label">{t('cinema.recommendedToStart')}</p>
                <h3>{spotlight.movie.title}</h3>
                <p>
                  {spotlight.firstShowtime.cinemaName} • {spotlight.firstShowtime.startTime}
                </p>
                <Link to={`/cinema/movie/${spotlight.movie.id}`} className="btn btn-primary cinema-compact-btn">
                  {t('cinema.startBooking')}
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="cinema-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.todayLabel')}</p>
              <h2 className="cinema-section-title">{t('cinema.nowShowingToday')}</h2>
            </div>
            <Link to="/cinema/now-showing" className="btn btn-outline cinema-link-btn">
              {t('cinema.navNowShowing')}
            </Link>
          </div>

          {loading ? (
            <div className="cinema-empty">{t('common.loading')}</div>
          ) : error ? (
            <div className="cinema-empty">{error}</div>
          ) : nowShowing.length === 0 ? (
            <div className="cinema-empty">{t('cinema.noShowtimes')}</div>
          ) : (
            <div className="cinema-now-grid">
              {nowShowing.map((item) => {
                const { movie, firstShowtime } = item;
                return (
                  <article key={movie.id} className="cinema-home-movie-card">
                    <Link to={`/cinema/movie/${movie.id}`} className="cinema-home-movie-poster-link">
                      <CinemaImage
                        src={movie.posterUrl}
                        fallbackSrc={DEFAULT_CINEMA_POSTER_URL}
                        alt={movie.title}
                        className="cinema-home-movie-poster"
                      />
                    </Link>

                    <div className="cinema-home-movie-body">
                      <div className="cinema-card-heading">
                        <h3>{movie.title}</h3>
                        {movie.originalTitle && movie.originalTitle !== movie.title && (
                          <p className="cinema-original-title">{movie.originalTitle}</p>
                        )}
                      </div>

                      <p className="cinema-card-meta-line">
                        {movie.genre} • {movie.runtime} • {movie.ageRating || t('common.unknown')}
                      </p>
                      <p className="cinema-card-synopsis">{movie.shortSynopsis}</p>

                      <div className="cinema-info-grid">
                        <div className="cinema-info-block">
                          <p className="cinema-info-label">{t('cinema.movieInfo')}</p>
                          <p className="cinema-info-value">
                            {movie.releaseYear || t('common.unknown')} • {movie.language || t('common.unknown')}
                          </p>
                        </div>
                        <div className="cinema-info-block">
                          <p className="cinema-info-label">{t('cinema.showtimesToday')}</p>
                          <div className="cinema-times-row">
                            {item.times.slice(0, 4).map((time) => (
                              <span key={`${movie.id}-${time}`} className="cinema-time-mini">{time}</span>
                            ))}
                            {item.times.length > 4 && (
                              <span className="cinema-time-mini">+{item.times.length - 4}</span>
                            )}
                          </div>
                        </div>
                        <div className="cinema-info-block">
                          <p className="cinema-info-label">{t('cinema.cinemaBranches')}</p>
                          <p className="cinema-info-value">
                            {t('cinema.branchShowSummary', {
                              branchCount: item.cinemaCount,
                              showCount: item.showtimeCount,
                            })}
                          </p>
                        </div>
                      </div>

                      <div className="cinema-card-actions">
                        <span className="cinema-pill">
                          {`${formatCurrency(firstShowtime.price)} • ${firstShowtime.startTime}`}
                        </span>
                        <Link to={`/cinema/movie/${movie.id}`} className="btn btn-primary cinema-compact-btn">
                          {t('cinema.selectShowtime')}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="cinema-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.weeklySchedule')}</p>
              <h2 className="cinema-section-title">{t('cinema.moviesThisWeek')}</h2>
            </div>
            <Link to="/cinema/schedule" className="btn btn-outline cinema-link-btn">
              {t('cinema.navSchedule')}
            </Link>
          </div>

          <div className="cinema-weekly-grid cinema-weekly-grid-rich">
            {weeklySchedule.map((day) => (
              <div key={day.key} className="cinema-weekly-card">
                <div className="cinema-weekly-head">
                  <div>
                  <strong>{day.label}</strong>
                    <p>{formatShortDate(day.date, locale)}</p>
                  </div>
                      <span>
                        {day.isToday ? t('cinema.todayLabel') : t('cinema.showtimesCount', { count: day.showtimeCount })}
                      </span>
                </div>

                <p className="cinema-weekly-summary">
                  {t('cinema.moviesShowtimesSummary', {
                    movieCount: day.movieCount,
                    showtimeCount: day.showtimeCount,
                  })}
                </p>

                {day.movies.length === 0 ? (
                  <p className="cinema-weekly-empty">{t('cinema.noShowtimes')}</p>
                ) : (
                  <div className="cinema-weekly-list">
                    {day.movies.slice(0, 5).map((item) => (
                      <Link
                        key={`${day.key}-${item.movie?.id}`}
                        to={`/cinema/movie/${item.movie?.id}`}
                        className="cinema-weekly-movie cinema-weekly-movie-rich"
                      >
                        <div>
                          <span>{item.movie?.title}</span>
                          <small>
                            {t('cinema.branchShowSummary', {
                              branchCount: item.cinemaCount,
                              showCount: item.showtimeCount,
                            })}
                          </small>
                        </div>
                        <em>{item.firstTime}</em>
                      </Link>
                    ))}
                    {day.movies.length > 5 && (
                      <p className="cinema-weekly-empty">{t('cinema.moreMovies', { count: day.movies.length - 5 })}</p>
                    )}
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
              <h2 className="cinema-section-title">{t('cinema.availableCinemaLocations')}</h2>
            </div>
            <Link to="/cinema/locations" className="btn btn-outline cinema-link-btn">
              {t('cinema.navLocations')}
            </Link>
          </div>

          <div className="cinema-branch-grid">
            {cinemas.map((branch) => (
              <div key={branch.id} className="cinema-branch-card cinema-branch-card-rich">
                <h3>{branch.name}</h3>
                <p>{branch.address}</p>
                <span>{branch.city}</span>
                <div className="cinema-branch-tags">
                  {(branch.features || []).map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
                <Link to="/cinema/schedule" className="cinema-branch-link">{t('cinema.viewShowtimesAtThisBranch')}</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="cinema-section">
          <div className="cinema-quick-booking">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.quickBooking')}</p>
              <h2 className="cinema-section-title">{t('cinema.startBookingUnderOneMinute')}</h2>
              <p className="cinema-subtitle cinema-quick-copy">{t('cinema.quickBookingDescription')}</p>
            </div>
            <div className="cinema-quick-steps">
              <span>{t('cinema.chooseMovie')}</span>
              <span>{t('cinema.selectBranch')}</span>
              <span>{t('cinema.pickShowtime')}</span>
              <span>{t('cinema.chooseSeats')}</span>
              <span>{t('cinema.checkoutTitle')}</span>
            </div>
            <div className="cinema-booking-actions">
              <Link to="/cinema/now-showing" className="btn btn-primary">{t('cinema.navNowShowing')}</Link>
              <Link to="/cinema/schedule" className="btn btn-outline">{t('cinema.navSchedule')}</Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default CinemaHome;
