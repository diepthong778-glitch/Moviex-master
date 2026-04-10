import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import { formatCurrency, formatShortDate, getTodayWeekIndex, getWeekDates } from '../utils/cinema';
import {
  DEFAULT_CINEMA_POSTER_URL,
  fetchCinemaShowtimes,
  filterShowtimesByWeek,
  getMovieCatalogFromShowtimes,
  isoDateFromWeekDate,
} from '../utils/cinemaApi';

function CinemaNowShowing() {
  const { t, i18n } = useTranslation();
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDay, setActiveDay] = useState(getTodayWeekIndex());
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [selectedMovieId, setSelectedMovieId] = useState('');

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

  useEffect(() => {
    let ignore = false;

    const loadNowShowing = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCinemaShowtimes();
        if (!ignore) {
          setShowtimes(data);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || t('cinema.loadNowShowingFailed'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadNowShowing();
    return () => {
      ignore = true;
    };
  }, []);

  const weeklyShowtimes = useMemo(
    () => filterShowtimesByWeek(showtimes, weekDates),
    [showtimes, weekDates]
  );

  const dayIso = useMemo(
    () => isoDateFromWeekDate(weekDates[activeDay]?.date),
    [weekDates, activeDay]
  );

  const dayShowtimes = useMemo(
    () => weeklyShowtimes.filter((showtime) => showtime.showDate === dayIso),
    [weeklyShowtimes, dayIso]
  );

  const cinemaOptions = useMemo(() => {
    const byId = new Map();
    dayShowtimes.forEach((showtime) => {
      if (byId.has(showtime.cinemaId)) return;
      byId.set(showtime.cinemaId, {
        id: showtime.cinemaId,
        name: showtime.cinemaName,
        city: showtime.cinemaCity,
      });
    });
    return Array.from(byId.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [dayShowtimes]);

  const movieOptions = useMemo(
    () => getMovieCatalogFromShowtimes(dayShowtimes).sort((left, right) => left.title.localeCompare(right.title)),
    [dayShowtimes]
  );

  useEffect(() => {
    if (selectedCinemaId && !cinemaOptions.some((cinema) => cinema.id === selectedCinemaId)) {
      setSelectedCinemaId('');
    }
  }, [selectedCinemaId, cinemaOptions]);

  useEffect(() => {
    if (selectedMovieId && !movieOptions.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId('');
    }
  }, [selectedMovieId, movieOptions]);

  const filteredShowtimes = useMemo(() => {
    return dayShowtimes.filter((showtime) => {
      if (selectedCinemaId && showtime.cinemaId !== selectedCinemaId) return false;
      if (selectedMovieId && showtime.movieId !== selectedMovieId) return false;
      return true;
    });
  }, [dayShowtimes, selectedCinemaId, selectedMovieId]);

  const dayMetrics = useMemo(() => {
    const metricMap = new Map();

    weekDates.forEach((day) => {
      const dateIso = isoDateFromWeekDate(day.date);
      const dayEntries = weeklyShowtimes.filter((showtime) => showtime.showDate === dateIso);
      metricMap.set(day.key, {
        movieCount: new Set(dayEntries.map((showtime) => showtime.movieId)).size,
        showtimeCount: dayEntries.length,
      });
    });

    return metricMap;
  }, [weekDates, weeklyShowtimes]);

  const nowShowing = useMemo(() => {
    const grouped = new Map();
    filteredShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.movieId)) {
        grouped.set(showtime.movieId, []);
      }
      grouped.get(showtime.movieId).push(showtime);
    });

    return Array.from(grouped.values()).map((entries) => {
      const sorted = entries.slice().sort((left, right) => left.startTime.localeCompare(right.startTime));
      const byCinema = new Map();

      sorted.forEach((item) => {
        if (!byCinema.has(item.cinemaId)) {
          byCinema.set(item.cinemaId, {
            cinemaId: item.cinemaId,
            cinemaName: item.cinemaName,
            cinemaCity: item.cinemaCity,
            times: [],
          });
        }
        byCinema.get(item.cinemaId).times.push(item.startTime);
      });

      return {
        movie: sorted[0].movie,
        firstShowtime: sorted[0],
        times: sorted.map((item) => item.startTime),
        showtimesByCinema: Array.from(byCinema.values()).map((item) => ({
          ...item,
          times: item.times.slice().sort((left, right) => left.localeCompare(right)),
        })),
        cinemaCount: new Set(sorted.map((item) => item.cinemaId)).size,
        showtimeCount: sorted.length,
      };
    }).sort((left, right) => left.movie.title.localeCompare(right.movie.title));
  }, [filteredShowtimes]);

  const filteredBranchCount = useMemo(
    () => new Set(filteredShowtimes.map((showtime) => showtime.cinemaId)).size,
    [filteredShowtimes]
  );

  const activeDayLabel = weekDates[activeDay]?.label || t('cinema.todayLabel');
  const activeDayDisplayDate = weekDates[activeDay] ? formatShortDate(weekDates[activeDay].date, locale) : '';

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />

        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.todayLabel')}</p>
            <h1 className="cinema-title">{t('cinema.navNowShowing')}</h1>
            <p className="cinema-subtitle">{t('cinema.nowShowingSubtitle')}</p>
          </div>
          <Link to="/cinema/schedule" className="btn btn-outline">
            {t('cinema.navSchedule')}
          </Link>
        </div>

        <div className="cinema-filter-bar">
          <select value={selectedMovieId} onChange={(event) => setSelectedMovieId(event.target.value)}>
            <option value="">{t('cinema.filterAllMovies')}</option>
            {movieOptions.map((movie) => (
              <option key={movie.id} value={movie.id}>{movie.title}</option>
            ))}
          </select>
          <select value={selectedCinemaId} onChange={(event) => setSelectedCinemaId(event.target.value)}>
            <option value="">{t('cinema.allBranches')}</option>
            {cinemaOptions.map((cinema) => (
              <option key={cinema.id} value={cinema.id}>{cinema.name}</option>
            ))}
          </select>
        </div>

        <div className="cinema-week-tabs">
          {weekDates.map((day) => (
            <button
              key={day.key}
              type="button"
              className={`cinema-week-tab${activeDay === day.key ? ' is-active' : ''}`}
              onClick={() => setActiveDay(day.key)}
            >
              <span>{day.label}</span>
              <strong>{formatShortDate(day.date, locale)}</strong>
              <em>{t('cinema.showtimesCount', { count: dayMetrics.get(day.key)?.showtimeCount || 0 })}</em>
            </button>
          ))}
        </div>

        <div className="cinema-results-strip">
          <span>{`${activeDayLabel} • ${activeDayDisplayDate}`}</span>
          <span>{t('cinema.moviesCount', { count: nowShowing.length })}</span>
          <span>{t('cinema.showtimesCount', { count: filteredShowtimes.length })}</span>
          <span>{t('cinema.branchesCount', { count: filteredBranchCount })}</span>
        </div>

        {loading ? (
          <p className="cinema-empty">{t('common.loading')}</p>
        ) : error ? (
          <p className="cinema-empty">{error}</p>
        ) : nowShowing.length === 0 ? (
          <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
        ) : (
          <div className="cinema-now-grid cinema-now-grid-rich">
            {nowShowing.map(({ movie, firstShowtime, times, showtimesByCinema, showtimeCount, cinemaCount }) => (
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
                    <h3>
                      <Link to={`/cinema/movie/${movie.id}`} className="cinema-title-link">
                        {movie.title}
                      </Link>
                    </h3>
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
                        {times.slice(0, 6).map((time) => (
                          <span key={`${movie.id}-${time}`} className="cinema-time-mini">{time}</span>
                        ))}
                        {times.length > 6 && <span className="cinema-time-mini">+{times.length - 6}</span>}
                      </div>
                    </div>
                    <div className="cinema-info-block">
                      <p className="cinema-info-label">{t('cinema.cinemaBranches')}</p>
                      <p className="cinema-info-value">
                        {t('cinema.branchShowSummary', { branchCount: cinemaCount, showCount: showtimeCount })}
                      </p>
                    </div>
                  </div>

                  <div className="cinema-now-showtimes-board">
                    {showtimesByCinema.slice(0, 3).map((entry) => (
                      <div key={`${movie.id}-${entry.cinemaId}`} className="cinema-now-showtimes-row">
                        <span>{entry.cinemaName}</span>
                        <div className="cinema-times-row">
                          {entry.times.slice(0, 5).map((time) => (
                            <Link
                              key={`${movie.id}-${entry.cinemaId}-${time}`}
                              to={`/cinema/movie/${movie.id}/showtimes`}
                              state={{
                                showDate: dayIso,
                                cinemaId: entry.cinemaId,
                                time,
                              }}
                              className="cinema-time-mini cinema-time-mini-link"
                            >
                              {time}
                            </Link>
                          ))}
                          {entry.times.length > 5 && <span className="cinema-time-mini">+{entry.times.length - 5}</span>}
                        </div>
                      </div>
                    ))}
                    {showtimesByCinema.length > 3 && (
                      <p className="cinema-weekly-empty">{t('cinema.moreMovies', { count: showtimesByCinema.length - 3 })}</p>
                    )}
                  </div>

                  <div className="cinema-card-actions">
                    <span className="cinema-pill">
                      {`${formatCurrency(firstShowtime.price)} • ${firstShowtime.startTime}`}
                    </span>
                    <Link to={`/cinema/movie/${movie.id}`} className="btn btn-outline cinema-compact-btn">
                      {t('cinema.movieInformation')}
                    </Link>
                    <Link
                      to={`/cinema/movie/${movie.id}/showtimes`}
                      state={{
                        showDate: dayIso,
                        cinemaId: firstShowtime.cinemaId,
                        time: firstShowtime.startTime,
                        showtimeId: firstShowtime.id,
                      }}
                      className="btn btn-primary cinema-compact-btn"
                    >
                      {t('cinema.selectShowtime')}
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CinemaNowShowing;
