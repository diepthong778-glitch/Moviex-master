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
  DEFAULT_CINEMA_BACKDROP_URL,
  fetchCinemaShowtimes,
  filterShowtimesByWeek,
  getMovieCatalogFromShowtimes,
  isoDateFromWeekDate,
} from '../utils/cinemaApi';

function CinemaSchedule() {
  const { t } = useTranslation();
  const weekDates = useMemo(() => getWeekDates(), []);
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
          setError(fetchError?.response?.data?.message || 'Unable to load cinema schedule.');
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

  const cinemas = useMemo(() => {
    const byId = new Map();
    weeklyShowtimes.forEach((showtime) => {
      if (byId.has(showtime.cinemaId)) return;
      byId.set(showtime.cinemaId, {
        id: showtime.cinemaId,
        name: showtime.cinemaName,
        city: showtime.cinemaCity,
      });
    });
    return Array.from(byId.values());
  }, [weeklyShowtimes]);

  const movies = useMemo(() => getMovieCatalogFromShowtimes(weeklyShowtimes), [weeklyShowtimes]);

  const filteredShowtimes = useMemo(() => {
    const dayIso = isoDateFromWeekDate(weekDates[activeDay]?.date);
    return weeklyShowtimes.filter((showtime) => {
      if (dayIso && showtime.showDate !== dayIso) return false;
      if (selectedMovieId && showtime.movieId !== selectedMovieId) return false;
      if (selectedCinemaId && showtime.cinemaId !== selectedCinemaId) return false;
      return true;
    });
  }, [weeklyShowtimes, weekDates, activeDay, selectedMovieId, selectedCinemaId]);

  const movieGroups = useMemo(() => {
    const grouped = new Map();

    filteredShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.movieId)) {
        grouped.set(showtime.movieId, {
          movie: showtime.movie,
          entries: new Map(),
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
          auditorium: showtime.auditoriumName,
          price: showtime.price,
          showtimes: [],
        });
      }

      group.entries.get(key).showtimes.push(showtime);
    });

    return Array.from(grouped.values()).map((group) => ({
      movie: group.movie,
      entries: Array.from(group.entries.values()).map((entry) => ({
        ...entry,
        showtimes: entry.showtimes.slice().sort((a, b) => a.startTime.localeCompare(b.startTime)),
      })),
    }));
  }, [filteredShowtimes]);

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.navSchedule')}</p>
            <h1 className="cinema-title">{t('cinema.navSchedule')}</h1>
            <p className="cinema-subtitle">{t('cinema.selectDate')}</p>
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
              <strong>{formatShortDate(day.date)}</strong>
              {day.isToday && <em>{t('cinema.todayLabel')}</em>}
            </button>
          ))}
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
              <div key={group.movie?.id} className="cinema-schedule-card cinema-rich-schedule-card">
                <div className="cinema-schedule-media">
                  <CinemaImage
                    src={group.movie?.backdropUrl || group.movie?.posterUrl}
                    fallbackSrc={DEFAULT_CINEMA_BACKDROP_URL}
                    alt={group.movie?.title}
                    className="cinema-schedule-backdrop"
                  />
                  <div className="cinema-schedule-media-overlay" />
                  <div className="cinema-schedule-media-copy">
                    <h3>{group.movie?.title}</h3>
                    {group.movie?.originalTitle && group.movie?.originalTitle !== group.movie?.title && (
                      <p className="cinema-original-title">{group.movie?.originalTitle}</p>
                    )}
                    <p>{group.movie?.genre}</p>
                    <p>{group.movie?.runtime} • {group.movie?.ageRating} • {group.movie?.releaseYear || 'TBA'}</p>
                    <p className="cinema-card-synopsis">{group.movie?.shortSynopsis}</p>
                  </div>
                </div>

                <div className="cinema-schedule-body">
                  <div className="cinema-schedule-rows">
                    {group.entries.map((entry) => (
                      <div key={`${entry.cinema?.id}-${entry.auditorium}`} className="cinema-schedule-row">
                        <div>
                          <p>{entry.cinema?.name}</p>
                          <span>{entry.cinema?.city} - {entry.auditorium}</span>
                        </div>
                        <div className="cinema-schedule-times">
                          {entry.showtimes.map((showtime) => (
                            <Link
                              key={showtime.id}
                              to="/cinema/seats"
                              state={{ showtimeId: showtime.id }}
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
              </div>
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
