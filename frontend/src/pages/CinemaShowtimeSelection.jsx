import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import CinemaBookingProgress from '../components/CinemaBookingProgress';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import PageTransition from '../components/motion/PageTransition';
import Reveal from '../components/motion/Reveal';
import StaggerGroup from '../components/motion/StaggerGroup';
import { useCinemaBooking } from '../context/CinemaBookingContext';
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
  const {
    showtime: bookingShowtime,
    setSelectedShowtime,
    clearSeatSelection,
    clearCheckoutSession,
  } = useCinemaBooking();

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

  const defaultDateSource = bookingShowtime?.showDate || location.state?.showDate;
  const defaultDayIndex = defaultDateSource
    ? weekDates.find((day) => isoDateFromWeekDate(day.date) === defaultDateSource)?.key ?? getTodayWeekIndex()
    : getTodayWeekIndex();

  const [selectedDayIndex, setSelectedDayIndex] = useState(defaultDayIndex);
  const [selectedCinemaId, setSelectedCinemaId] = useState(
    bookingShowtime?.cinemaId || location.state?.cinemaId || ''
  );
  const [selectedShowtimeId, setSelectedShowtimeId] = useState(
    bookingShowtime?.id || location.state?.showtimeId || null
  );

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
  }, [movieId, t]);

  const movie = useMemo(() => allShowtimes[0]?.movie || null, [allShowtimes]);

  const selectedDayIso = useMemo(() => {
    const day = weekDates.find((item) => item.key === selectedDayIndex);
    return day ? isoDateFromWeekDate(day.date) : '';
  }, [weekDates, selectedDayIndex]);

  const filteredShowtimes = useMemo(() => {
    return allShowtimes
      .filter((showtime) => {
        if (selectedCinemaId && showtime.cinemaId !== selectedCinemaId) return false;
        if (selectedDayIso && showtime.showDate !== selectedDayIso) return false;
        return true;
      })
      .sort((left, right) => left.startTime.localeCompare(right.startTime));
  }, [allShowtimes, selectedCinemaId, selectedDayIso]);

  useEffect(() => {
    if (!filteredShowtimes.length) {
      setSelectedShowtimeId(null);
      return;
    }

    const selectedStillValid = filteredShowtimes.some((showtime) => showtime.id === selectedShowtimeId);
    if (!selectedStillValid) {
      setSelectedShowtimeId(filteredShowtimes[0].id);
    }
  }, [filteredShowtimes, selectedShowtimeId]);

  const selectedShowtime = useMemo(
    () => filteredShowtimes.find((showtime) => showtime.id === selectedShowtimeId) || null,
    [filteredShowtimes, selectedShowtimeId]
  );

  const handleContinue = () => {
    if (!selectedShowtime) return;
    setSelectedShowtime(selectedShowtime);
    clearSeatSelection();
    clearCheckoutSession();
    navigate('/cinema/seats');
  };

  const renderShell = (content) => (
    <PageTransition as="div" className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        {content}
      </div>
    </PageTransition>
  );

  if (loading) {
    return renderShell(<p className="cinema-empty">{t('common.loading')}</p>);
  }

  if (error) {
    return renderShell(<p className="cinema-empty">{error}</p>);
  }

  if (!movie) {
    return renderShell(<p className="cinema-empty">{t('common.unknownMovie')}</p>);
  }

  return (
    <PageTransition as="div" className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <Reveal delay={10}>
          <CinemaBookingProgress currentStep="showtime" />
        </Reveal>

        <Reveal className="cinema-page-header cinema-page-header-rich" delay={30} y={12}>
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
                {movie.genre} | {movie.runtime} | {movie.ageRating || t('common.unknown')}
              </p>
              <p className="cinema-card-synopsis">{movie.shortSynopsis}</p>
            </div>
          </div>
          <Link to={`/cinema/movie/${movie.id}`} className="btn btn-outline">
            {t('cinema.movieInformation')}
          </Link>
        </Reveal>

        <Reveal as="section" className="cinema-step-card" delay={50}>
          <h3>{t('cinema.selectShowtime')}</h3>

          <div className="admin-form-grid" style={{ marginBottom: '16px' }}>
            <select
              className="field-control"
              value={selectedCinemaId}
              onChange={(event) => setSelectedCinemaId(event.target.value)}
            >
              {cinemas.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name} - {branch.city}
                </option>
              ))}
            </select>

            <select
              className="field-control"
              value={selectedDayIndex}
              onChange={(event) => setSelectedDayIndex(Number(event.target.value))}
            >
              {weekDates.map((day) => (
                <option key={day.key} value={day.key}>
                  {day.label} - {formatShortDate(day.date, locale)}
                </option>
              ))}
            </select>
          </div>

          {filteredShowtimes.length === 0 ? (
            <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
          ) : (
            <StaggerGroup className="cinema-option-grid">
              {filteredShowtimes.map((showtime, index) => (
                <button
                  key={showtime.id}
                  type="button"
                  className={`cinema-option mx-stagger-item mx-pressable${selectedShowtimeId === showtime.id ? ' is-active' : ''}`}
                  style={{ '--motion-item-delay': `${Math.min(index, 7) * 45}ms` }}
                  onClick={() => setSelectedShowtimeId(showtime.id)}
                >
                  <strong>{showtime.startTime} - {showtime.endTime}</strong>
                  <span>{showtime.cinemaName}</span>
                  <span>{showtime.auditoriumName}</span>
                </button>
              ))}
            </StaggerGroup>
          )}
        </Reveal>

        <Reveal className="cinema-action-bar" delay={70} y={10}>
          <Link to="/cinema/now-showing" className="btn btn-outline">
            {t('cinema.navNowShowing')}
          </Link>
          <button type="button" className="btn btn-primary" onClick={handleContinue} disabled={!selectedShowtime}>
            {t('cinema.ctaSelectSeats')}
          </button>
        </Reveal>
      </div>
    </PageTransition>
  );
}

export default CinemaShowtimeSelection;
