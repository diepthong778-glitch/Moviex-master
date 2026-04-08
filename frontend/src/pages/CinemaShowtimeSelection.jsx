import { useMemo, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cinemaBranches, cinemaMovies, showtimeCatalog } from '../data/cinemaData';
import {
  expandShowtimeCatalog,
  filterShowtimes,
  formatShortDate,
  getTodayWeekIndex,
  getWeekDates,
  loadCustomShowtimes,
  mergeShowtimes,
} from '../utils/cinema';

function CinemaShowtimeSelection() {
  const { movieId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const weekDates = useMemo(() => getWeekDates(), []);
  const movie = cinemaMovies.find((item) => item.id === movieId);
  const defaultDayIndex = location.state?.dayIndex ?? getTodayWeekIndex();
  const [selectedCinemaId, setSelectedCinemaId] = useState(location.state?.cinemaId || cinemaBranches[0]?.id);
  const [selectedDayIndex, setSelectedDayIndex] = useState(defaultDayIndex);
  const [selectedTime, setSelectedTime] = useState(location.state?.time || null);

  const baseShowtimes = useMemo(
    () => expandShowtimeCatalog(showtimeCatalog, cinemaMovies, weekDates),
    [weekDates]
  );
  const customShowtimes = useMemo(() => loadCustomShowtimes(), []);
  const showtimes = useMemo(
    () => mergeShowtimes(baseShowtimes, customShowtimes),
    [baseShowtimes, customShowtimes]
  );

  const filteredShowtimes = useMemo(
    () =>
      filterShowtimes(showtimes, {
        movieId,
        cinemaId: selectedCinemaId,
        dayIndex: selectedDayIndex,
      }),
    [showtimes, movieId, selectedCinemaId, selectedDayIndex]
  );

  const timeOptions = useMemo(() => {
    const times = filteredShowtimes.map((showtime) => showtime.startTime);
    return Array.from(new Set(times)).sort();
  }, [filteredShowtimes]);

  const handleContinue = () => {
    if (!selectedTime || !filteredShowtimes.length) return;
    const showtime = filteredShowtimes.find((item) => item.startTime === selectedTime) || filteredShowtimes[0];
    navigate('/cinema/seats', {
      state: {
        movieId,
        cinemaId: selectedCinemaId,
        dayIndex: selectedDayIndex,
        showtimeId: showtime.id,
        showDate: showtime.showDate,
        time: selectedTime,
        auditorium: showtime.auditorium,
        price: showtime.price,
      },
    });
  };

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
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.selectShowtime')}</p>
            <h1 className="cinema-title">{movie.title}</h1>
            <p className="cinema-subtitle">{movie.genre} - {movie.duration}</p>
          </div>
          <Link to={`/cinema/movie/${movie.id}`} className="btn btn-outline">
            {t('cinema.navNowShowing')}
          </Link>
        </div>

        <div className="cinema-step-grid">
          <div className="cinema-step-card">
            <h3>{t('cinema.selectCinema')}</h3>
            <div className="cinema-option-grid">
              {cinemaBranches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  className={`cinema-option${selectedCinemaId === branch.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedCinemaId(branch.id)}
                >
                  <strong>{branch.name}</strong>
                  <span>{branch.city}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cinema-step-card">
            <h3>{t('cinema.selectDate')}</h3>
            <div className="cinema-week-tabs compact">
              {weekDates.map((day) => (
                <button
                  key={day.key}
                  type="button"
                  className={`cinema-week-tab${selectedDayIndex === day.key ? ' is-active' : ''}`}
                  onClick={() => setSelectedDayIndex(day.key)}
                >
                  <span>{day.label}</span>
                  <strong>{formatShortDate(day.date)}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="cinema-step-card">
            <h3>{t('cinema.selectShowtime')}</h3>
            {timeOptions.length === 0 ? (
              <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
            ) : (
              <div className="cinema-time-grid">
                {timeOptions.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`cinema-time-chip${selectedTime === time ? ' is-active' : ''}`}
                    onClick={() => setSelectedTime(time)}
                  >
                    {time}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="cinema-action-bar">
          <Link to="/cinema" className="btn btn-outline">
            {t('cinema.backToCinema')}
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={!selectedTime}>
            {t('cinema.ctaSelectSeats')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CinemaShowtimeSelection;
