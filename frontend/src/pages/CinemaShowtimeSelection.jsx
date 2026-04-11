import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CinemaBookingProgress from '../components/CinemaBookingProgress';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import { formatShortDate, getTodayWeekIndex, getWeekDates } from '../utils/cinema';
import {
  DEFAULT_CINEMA_POSTER_URL,
  fetchCinemas,
  fetchCinemaShowtimes,
  isoDateFromWeekDate,
} from '../utils/cinemaApi';

function CinemaShowtimeSelection() {
  const { movieId } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
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

  const [cinemas, setCinemas] = useState([]);
  const [allShowtimes, setAllShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const defaultDayIndex = location.state?.showDate
    ? weekDates.find((day) => isoDateFromWeekDate(day.date) === location.state.showDate)?.key ?? getTodayWeekIndex()
    : getTodayWeekIndex();

  const [selectedDayIndex, setSelectedDayIndex] = useState(defaultDayIndex);
  const [selectedCinemaId, setSelectedCinemaId] = useState(location.state?.cinemaId || '');
  const [selectedTime, setSelectedTime] = useState(location.state?.time || null);
  const [selectedShowtimeId, setSelectedShowtimeId] = useState(location.state?.showtimeId || null);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      setLoading(true);
      setError('');
      try {
        const [cinemaList, showtimeList] = await Promise.all([
          fetchCinemas(),
          fetchCinemaShowtimes({ movieId }),
        ]);

        if (ignore) return;

        setCinemas(cinemaList);
        setAllShowtimes(showtimeList);

        if (!selectedCinemaId) {
          const firstCinemaId = showtimeList[0]?.cinemaId || cinemaList[0]?.id || '';
          setSelectedCinemaId(firstCinemaId);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || t('cinema.loadShowtimeOptionsFailed'));
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
  }, [movieId]);

  const movie = useMemo(() => allShowtimes[0]?.movie || null, [allShowtimes]);

  const selectedDayIso = useMemo(() => {
    const day = weekDates.find((item) => item.key === selectedDayIndex);
    return day ? isoDateFromWeekDate(day.date) : '';
  }, [weekDates, selectedDayIndex]);

  const filteredShowtimes = useMemo(() => {
    return allShowtimes.filter((showtime) => {
      if (selectedCinemaId && showtime.cinemaId !== selectedCinemaId) return false;
      if (selectedDayIso && showtime.showDate !== selectedDayIso) return false;
      return true;
    });
  }, [allShowtimes, selectedCinemaId, selectedDayIso]);

  useEffect(() => {
    if (!filteredShowtimes.length) {
      setSelectedTime(null);
      setSelectedShowtimeId(null);
      return;
    }

    const preferred = filteredShowtimes.find((showtime) => showtime.id === selectedShowtimeId)
      || filteredShowtimes.find((showtime) => showtime.startTime === selectedTime)
      || filteredShowtimes[0];

    setSelectedShowtimeId(preferred.id);
    setSelectedTime(preferred.startTime);
  }, [filteredShowtimes, selectedShowtimeId, selectedTime]);

  const handleContinue = () => {
    const selectedShowtime = filteredShowtimes.find((showtime) => showtime.id === selectedShowtimeId);
    if (!selectedShowtime) return;

    navigate('/cinema/seats', {
      state: {
        showtimeId: selectedShowtime.id,
      },
    });
  };

  if (loading) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
          <p className="cinema-empty">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
          <p className="cinema-empty">{error}</p>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
          <p className="cinema-empty">{t('common.unknownMovie')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <CinemaBookingProgress currentStep="showtime" />
        <div className="cinema-page-header cinema-page-header-rich">
          <div className="cinema-movie-summary">
            <CinemaImage
              src={movie.posterUrl}
              fallbackSrc={DEFAULT_CINEMA_POSTER_URL}
              alt={movie.title}
              className="cinema-movie-summary-poster"
            />
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.selectShowtime')}</p>
              <h1 className="cinema-title">{movie.title}</h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="cinema-original-title">{movie.originalTitle}</p>
              )}
              <p className="cinema-subtitle">
                {movie.genre} • {movie.runtime} • {movie.ageRating || t('common.unknown')} • {movie.releaseYear || t('common.unknown')}
              </p>
              <p className="cinema-card-synopsis">{movie.shortSynopsis}</p>
            </div>
          </div>
          <Link to={`/cinema/movie/${movie.id}`} className="btn btn-outline">
            {t('cinema.navNowShowing')}
          </Link>
        </div>

        <div className="cinema-step-grid">
          <div className="cinema-step-card">
            <span className="cinema-step-number">2</span>
            <h3>{t('cinema.selectCinema')}</h3>
            <div className="cinema-option-grid">
              {cinemas.map((branch) => (
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
            <span className="cinema-step-number">3</span>
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
                  <strong>{formatShortDate(day.date, locale)}</strong>
                </button>
              ))}
            </div>
          </div>

          <div className="cinema-step-card">
            <span className="cinema-step-number">4</span>
            <h3>{t('cinema.selectShowtime')}</h3>
            {filteredShowtimes.length === 0 ? (
              <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
            ) : (
              <div className="cinema-time-grid">
                {filteredShowtimes.map((showtime) => (
                  <button
                    key={showtime.id}
                    type="button"
                    className={`cinema-time-chip${selectedShowtimeId === showtime.id ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedShowtimeId(showtime.id);
                      setSelectedTime(showtime.startTime);
                    }}
                  >
                    {showtime.startTime} - {showtime.auditoriumName}
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

