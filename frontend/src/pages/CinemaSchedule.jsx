import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import {
  formatCurrency,
  formatShortDate,
  getTodayWeekIndex,
  getWeekDates,
} from '../utils/cinema';
import {
  DEFAULT_CINEMA_POSTER_URL,
  fetchCinemaShowtimes,
  filterShowtimesByWeek,
  getMovieCatalogFromShowtimes,
  isoDateFromWeekDate,
} from '../utils/cinemaApi';

function CinemaSchedule() {
  const { t, i18n } = useTranslation();
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

  const [activeDay, setActiveDay] = useState(getTodayWeekIndex());
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;

    const loadSchedule = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCinemaShowtimes();
        if (!ignore) {
          setShowtimes(data);
        }
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

    loadSchedule();
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

  const cinemas = useMemo(() => {
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

  const movies = useMemo(
    () => getMovieCatalogFromShowtimes(dayShowtimes).sort((left, right) => left.title.localeCompare(right.title)),
    [dayShowtimes]
  );

  useEffect(() => {
    if (selectedMovieId && !movies.some((movie) => movie.id === selectedMovieId)) {
      setSelectedMovieId('');
    }
  }, [selectedMovieId, movies]);

  useEffect(() => {
    if (selectedCinemaId && !cinemas.some((cinema) => cinema.id === selectedCinemaId)) {
      setSelectedCinemaId('');
    }
  }, [selectedCinemaId, cinemas]);

  const filteredShowtimes = useMemo(() => {
    return dayShowtimes.filter((showtime) => {
      if (selectedMovieId && showtime.movieId !== selectedMovieId) return false;
      if (selectedCinemaId && showtime.cinemaId !== selectedCinemaId) return false;
      return true;
    });
  }, [dayShowtimes, selectedMovieId, selectedCinemaId]);

  const dayMetrics = useMemo(() => {
    const metricMap = new Map();

    weekDates.forEach((day) => {
      const dateIso = isoDateFromWeekDate(day.date);
      const entries = weeklyShowtimes.filter((showtime) => showtime.showDate === dateIso);
      metricMap.set(day.key, {
        movieCount: new Set(entries.map((showtime) => showtime.movieId)).size,
        showtimeCount: entries.length,
      });
    });

    return metricMap;
  }, [weekDates, weeklyShowtimes]);

  const movieGroups = useMemo(() => {
    const grouped = new Map();

    filteredShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.movieId)) {
        grouped.set(showtime.movieId, {
          movie: showtime.movie,
          entries: new Map(),
          showtimeCount: 0,
          minPrice: Number.POSITIVE_INFINITY,
          firstTime: showtime.startTime,
          cinemaSet: new Set(),
        });
      }

      const group = grouped.get(showtime.movieId);
      const key = `${showtime.cinemaId}-${showtime.auditoriumId}-${showtime.price}`;

      if (!group.entries.has(key)) {
        group.entries.set(key, {
          cinema: {
            id: showtime.cinemaId,
            name: showtime.cinemaName,
            city: showtime.cinemaCity,
          },
          auditoriumId: showtime.auditoriumId,
          auditorium: showtime.auditoriumName,
          price: showtime.price,
          showtimes: [],
        });
      }

      group.entries.get(key).showtimes.push(showtime);
      group.showtimeCount += 1;
      group.minPrice = Math.min(group.minPrice, Number(showtime.price || 0));
      if (showtime.startTime < group.firstTime) {
        group.firstTime = showtime.startTime;
      }
      group.cinemaSet.add(showtime.cinemaId);
    });

    return Array.from(grouped.values())
      .map((group) => ({
        movie: group.movie,
        showtimeCount: group.showtimeCount,
        firstTime: group.firstTime,
        minPrice: Number.isFinite(group.minPrice) ? group.minPrice : 0,
        cinemaCount: group.cinemaSet.size,
        entries: Array.from(group.entries.values())
          .map((entry) => ({
            ...entry,
            showtimes: entry.showtimes.slice().sort((left, right) => left.startTime.localeCompare(right.startTime)),
          }))
          .sort((left, right) => {
            const cinemaCompare = left.cinema.name.localeCompare(right.cinema.name);
            if (cinemaCompare !== 0) return cinemaCompare;
            return left.auditorium.localeCompare(right.auditorium);
          }),
      }))
      .sort((left, right) => {
        const timeCompare = left.firstTime.localeCompare(right.firstTime);
        if (timeCompare !== 0) return timeCompare;
        return left.movie.title.localeCompare(right.movie.title);
      });
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
            <p className="cinema-section-eyebrow">{t('cinema.navSchedule')}</p>
            <h1 className="cinema-title">{t('cinema.navSchedule')}</h1>
            <p className="cinema-subtitle">{t('cinema.scheduleSubtitle')}</p>
          </div>
        </div>

        <div className="cinema-filter-bar">
          <select value={selectedMovieId} onChange={(event) => setSelectedMovieId(event.target.value)}>
            <option value="">{t('cinema.filterAllMovies')}</option>
            {movies.map((movie) => (
              <option key={movie.id} value={movie.id}>{movie.title}</option>
            ))}
          </select>
          <select value={selectedCinemaId} onChange={(event) => setSelectedCinemaId(event.target.value)}>
            <option value="">{t('cinema.filterAllCinemas')}</option>
            {cinemas.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-outline cinema-compact-btn"
            onClick={() => {
              setSelectedMovieId('');
              setSelectedCinemaId('');
            }}
          >
            Clear Filters
          </button>
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
          <span>{t('cinema.moviesCount', { count: movieGroups.length })}</span>
          <span>{t('cinema.showtimesCount', { count: filteredShowtimes.length })}</span>
          <span>{t('cinema.branchesCount', { count: filteredBranchCount })}</span>
        </div>

        {loading ? (
          <div className="cinema-empty">{t('common.loading')}</div>
        ) : error ? (
          <div className="cinema-empty">{error}</div>
        ) : movieGroups.length === 0 ? (
          <div className="cinema-empty">{t('cinema.noShowtimes')}</div>
        ) : (
          <div className="cinema-schedule-list">
            {movieGroups.map((group) => (
              <article key={group.movie?.id} className="cinema-schedule-card cinema-rich-schedule-card cinema-schedule-card-compact">
                <div className="cinema-schedule-card-head">
                  <Link to={`/cinema/movie/${group.movie?.id}`} className="cinema-schedule-poster-link">
                    <CinemaImage
                      src={group.movie?.posterUrl}
                      fallbackSrc={DEFAULT_CINEMA_POSTER_URL}
                      alt={group.movie?.title}
                      className="cinema-schedule-poster"
                    />
                  </Link>

                  <div className="cinema-schedule-card-summary">
                    <h3>
                      <Link to={`/cinema/movie/${group.movie?.id}`} className="cinema-title-link">
                        {group.movie?.title}
                      </Link>
                    </h3>
                    {group.movie?.originalTitle && group.movie?.originalTitle !== group.movie?.title && (
                      <p className="cinema-original-title">{group.movie?.originalTitle}</p>
                    )}
                    <p className="cinema-card-meta-line">
                      {group.movie?.genre} • {group.movie?.runtime} • {group.movie?.ageRating || t('common.unknown')}
                    </p>
                    <p className="cinema-card-synopsis">{group.movie?.shortSynopsis}</p>

                    <div className="cinema-results-strip cinema-schedule-summary-pills">
                      <span>{t('cinema.showtimesCount', { count: group.showtimeCount })}</span>
                      <span>{t('cinema.branchesCount', { count: group.cinemaCount })}</span>
                      <span>{`${t('cinema.startTime')}: ${group.firstTime}`}</span>
                      <span>{`${t('cinema.price')}: ${formatCurrency(group.minPrice)}`}</span>
                    </div>

                    <div className="cinema-card-actions">
                      <Link to={`/cinema/movie/${group.movie?.id}`} className="btn btn-outline cinema-compact-btn">
                        {t('cinema.movieInformation')}
                      </Link>
                      <Link
                        to={`/cinema/movie/${group.movie?.id}/showtimes`}
                        state={{
                          showDate: dayIso,
                          showtimeId: group.entries[0]?.showtimes[0]?.id,
                          cinemaId: group.entries[0]?.cinema?.id,
                          time: group.entries[0]?.showtimes[0]?.startTime,
                        }}
                        className="btn btn-primary cinema-compact-btn"
                      >
                        {t('cinema.selectShowtime')}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="cinema-schedule-body">
                  <div className="cinema-schedule-rows">
                    {group.entries.map((entry) => (
                      <div key={`${entry.cinema?.id}-${entry.auditoriumId}-${entry.price}`} className="cinema-schedule-row">
                        <div>
                          <p>{entry.cinema?.name}</p>
                          <span>{entry.cinema?.city} - {entry.auditorium}</span>
                        </div>
                        <div className="cinema-schedule-times">
                          {entry.showtimes.map((showtime) => (
                            <Link
                              key={showtime.id}
                              to={`/cinema/movie/${group.movie?.id}/showtimes`}
                              state={{
                                showDate: showtime.showDate,
                                showtimeId: showtime.id,
                                cinemaId: showtime.cinemaId,
                                time: showtime.startTime,
                              }}
                              className="cinema-time-chip"
                            >
                              {showtime.startTime}
                            </Link>
                          ))}
                          <span className="cinema-time-price">{formatCurrency(entry.price)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="cinema-back-link">
          <Link to="/cinema" className="btn btn-outline">
            {t('cinema.backToCinema')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default CinemaSchedule;
