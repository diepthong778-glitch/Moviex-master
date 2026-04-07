import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { cinemaBranches, cinemaMovies, showtimeCatalog } from '../data/cinemaData';
import {
  expandShowtimeCatalog,
  filterShowtimes,
  formatCurrency,
  formatShortDate,
  getTodayWeekIndex,
  getWeekDates,
  loadCustomShowtimes,
  mergeShowtimes,
  saveCustomShowtimes,
} from '../utils/cinema';

const parseDurationMinutes = (durationLabel) => {
  if (!durationLabel) return null;
  const match = String(durationLabel).match(/(\d+)/);
  if (!match) return null;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) ? minutes : null;
};

const addMinutesToTime = (time, minutes) => {
  if (!time || minutes == null) return '';
  const [hourStr, minuteStr] = time.split(':');
  const baseMinutes = Number(hourStr) * 60 + Number(minuteStr);
  const total = baseMinutes + minutes;
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

function CinemaSchedule() {
  const { t } = useTranslation();
  const { checkRole } = useAuth();
  const weekDates = useMemo(() => getWeekDates(), []);
  const [activeDay, setActiveDay] = useState(getTodayWeekIndex());
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [customShowtimes, setCustomShowtimes] = useState(() => loadCustomShowtimes());

  const baseShowtimes = useMemo(
    () => expandShowtimeCatalog(showtimeCatalog, cinemaMovies, weekDates),
    [weekDates]
  );
  const showtimes = useMemo(
    () => mergeShowtimes(baseShowtimes, customShowtimes),
    [baseShowtimes, customShowtimes]
  );

  const filteredShowtimes = useMemo(
    () =>
      filterShowtimes(showtimes, {
        dayIndex: activeDay,
        movieId: selectedMovieId || null,
        cinemaId: selectedCinemaId || null,
      }),
    [showtimes, activeDay, selectedMovieId, selectedCinemaId]
  );

  const movieGroups = useMemo(() => {
    const grouped = new Map();
    filteredShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.movieId)) {
        grouped.set(showtime.movieId, []);
      }
      grouped.get(showtime.movieId).push(showtime);
    });

    return Array.from(grouped.entries()).map(([movieId, entries]) => {
      const movie = cinemaMovies.find((item) => item.id === movieId);
      const byCinema = new Map();
      entries.forEach((entry) => {
        const key = `${entry.cinemaId}-${entry.auditorium}-${entry.price}`;
        if (!byCinema.has(key)) {
          byCinema.set(key, {
            cinema: cinemaBranches.find((branch) => branch.id === entry.cinemaId),
            auditorium: entry.auditorium,
            price: entry.price,
            times: [],
          });
        }
        byCinema.get(key).times.push(entry.startTime);
      });

      byCinema.forEach((group) => {
        group.times = Array.from(new Set(group.times)).sort();
      });

      return {
        movie,
        entries: Array.from(byCinema.values()),
      };
    });
  }, [filteredShowtimes]);

  const [formState, setFormState] = useState({
    movieId: cinemaMovies[0]?.id || '',
    cinemaId: cinemaBranches[0]?.id || '',
    auditorium: '',
    dayIndex: String(getTodayWeekIndex()),
    startTime: '',
    price: '',
  });

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleCreateShowtime = (event) => {
    event.preventDefault();
    if (!formState.movieId || !formState.cinemaId || !formState.auditorium || !formState.startTime) return;

    const dayIndex = Number(formState.dayIndex);
    const showDate = weekDates[dayIndex]?.date;
    const showDateIso = showDate
      ? `${showDate.getFullYear()}-${String(showDate.getMonth() + 1).padStart(2, '0')}-${String(showDate.getDate()).padStart(2, '0')}`
      : '';
    const movie = cinemaMovies.find((item) => item.id === formState.movieId);
    const durationMinutes = parseDurationMinutes(movie?.duration);
    const endTime = addMinutesToTime(formState.startTime, durationMinutes);

    const newShowtime = {
      id: `custom-${Date.now()}`,
      movieId: formState.movieId,
      cinemaId: formState.cinemaId,
      auditorium: formState.auditorium,
      dayIndex,
      showDate: showDateIso,
      startTime: formState.startTime,
      endTime,
      price: Number(formState.price) || 0,
    };

    const nextShowtimes = [...customShowtimes, newShowtime];
    setCustomShowtimes(nextShowtimes);
    saveCustomShowtimes(nextShowtimes);
  };

  const computedEndTime = useMemo(() => {
    const movie = cinemaMovies.find((item) => item.id === formState.movieId);
    const durationMinutes = parseDurationMinutes(movie?.duration);
    return addMinutesToTime(formState.startTime, durationMinutes);
  }, [formState.movieId, formState.startTime]);

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.navSchedule')}</p>
            <h1 className="cinema-title">{t('cinema.navSchedule')}</h1>
            <p className="cinema-subtitle">{t('cinema.selectDate')}</p>
          </div>
        </div>

        {checkRole('ROLE_ADMIN') && (
          <div className="cinema-admin-card">
            <h3>{t('cinema.adminCreate')}</h3>
            <form className="cinema-admin-form" onSubmit={handleCreateShowtime}>
              <label>
                {t('cinema.selectMovie')}
                <select name="movieId" value={formState.movieId} onChange={handleFormChange}>
                  {cinemaMovies.map((movie) => (
                    <option key={movie.id} value={movie.id}>{movie.title}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('cinema.selectCinema')}
                <select name="cinemaId" value={formState.cinemaId} onChange={handleFormChange}>
                  {cinemaBranches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('cinema.auditorium')}
                <input name="auditorium" value={formState.auditorium} onChange={handleFormChange} placeholder="Hall A" />
              </label>
              <label>
                {t('cinema.selectDate')}
                <select name="dayIndex" value={formState.dayIndex} onChange={handleFormChange}>
                  {weekDates.map((day) => (
                    <option key={day.key} value={day.key}>{day.label} {formatShortDate(day.date)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t('cinema.startTime')}
                <input type="time" name="startTime" value={formState.startTime} onChange={handleFormChange} />
              </label>
              <label>
                {t('cinema.endTime')}
                <input type="text" value={computedEndTime || '-'} readOnly />
              </label>
              <label>
                {t('cinema.price')}
                <input type="number" name="price" value={formState.price} onChange={handleFormChange} />
              </label>
              <button type="submit" className="btn btn-primary">
                {t('cinema.adminCreate')}
              </button>
            </form>
          </div>
        )}

        <div className="cinema-filter-bar">
          <select value={selectedMovieId} onChange={(event) => setSelectedMovieId(event.target.value)}>
            <option value="">{t('cinema.filterAllMovies')}</option>
            {cinemaMovies.map((movie) => (
              <option key={movie.id} value={movie.id}>{movie.title}</option>
            ))}
          </select>
          <select value={selectedCinemaId} onChange={(event) => setSelectedCinemaId(event.target.value)}>
            <option value="">{t('cinema.filterAllCinemas')}</option>
            {cinemaBranches.map((branch) => (
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

        {movieGroups.length === 0 ? (
          <div className="cinema-empty">{t('cinema.noShowtimes')}</div>
        ) : (
          <div className="cinema-schedule-list">
            {movieGroups.map((group) => (
              <div key={group.movie?.id} className="cinema-schedule-card">
                <img src={group.movie?.poster} alt={group.movie?.title} />
                <div className="cinema-schedule-body">
                  <div className="cinema-schedule-head">
                    <h3>{group.movie?.title}</h3>
                    <span>{group.movie?.genre} - {group.movie?.duration}</span>
                  </div>
                  <div className="cinema-schedule-rows">
                    {group.entries.map((entry) => (
                      <div key={`${entry.cinema?.id}-${entry.auditorium}`} className="cinema-schedule-row">
                        <div>
                          <p>{entry.cinema?.name}</p>
                          <span>{entry.cinema?.city} - {entry.auditorium}</span>
                        </div>
                        <div className="cinema-schedule-times">
                          {entry.times.map((time) => (
                            <Link
                              key={time}
                              to={`/cinema/movie/${group.movie?.id}/showtimes`}
                              state={{ cinemaId: entry.cinema?.id, dayIndex: activeDay, time }}
                              className="cinema-time-chip"
                            >
                              {time}
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
