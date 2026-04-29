import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CinemaBookingProgress from '../components/CinemaBookingProgress';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import { useCinemaBooking } from '../context/CinemaBookingContext';
import { formatCurrency } from '../utils/cinema';
import {
  DEFAULT_CINEMA_BACKDROP_URL,
  DEFAULT_CINEMA_POSTER_URL,
  fetchCinemaShowtimes,
  getTodayIsoDate,
} from '../utils/cinemaApi';

const formatDateLabel = (isoDate, locale = 'en-US') => {
  if (!isoDate) return '-';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
};

function CinemaMovieDetail() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const {
    showtime: bookingShowtime,
    setSelectedShowtime,
    clearSeatSelection,
    clearCheckoutSession,
  } = useCinemaBooking();
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [selectedShowDate, setSelectedShowDate] = useState('');
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');

  const locale = i18n.language || 'en-US';
  const todayIso = useMemo(() => getTodayIsoDate(), []);

  useEffect(() => {
    let ignore = false;

    const loadMovieShowtimes = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCinemaShowtimes({ movieId });
        if (!ignore) {
          setShowtimes(data);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || t('cinema.loadMovieShowtimesFailed'));
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadMovieShowtimes();
    return () => {
      ignore = true;
    };
  }, [movieId, t]);

  const sortedShowtimes = useMemo(() => {
    return showtimes
      .slice()
      .sort((a, b) => `${a.showDate}-${a.startTime}`.localeCompare(`${b.showDate}-${b.startTime}`));
  }, [showtimes]);

  const movie = useMemo(() => sortedShowtimes[0]?.movie || null, [sortedShowtimes]);

  const cinemaOptions = useMemo(() => {
    const grouped = new Map();
    sortedShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.cinemaId)) {
        grouped.set(showtime.cinemaId, {
          id: showtime.cinemaId,
          name: showtime.cinemaName,
          city: showtime.cinemaCity,
          showCount: 0,
        });
      }
      grouped.get(showtime.cinemaId).showCount += 1;
    });
    return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [sortedShowtimes]);

  const dateOptions = useMemo(() => {
    const items = new Set();
    sortedShowtimes.forEach((showtime) => {
      if (!selectedCinemaId || showtime.cinemaId === selectedCinemaId) {
        items.add(showtime.showDate);
      }
    });
    return Array.from(items).sort((a, b) => a.localeCompare(b));
  }, [selectedCinemaId, sortedShowtimes]);

  const filteredShowtimes = useMemo(() => {
    return sortedShowtimes.filter((showtime) => {
      if (selectedCinemaId && showtime.cinemaId !== selectedCinemaId) return false;
      if (selectedShowDate && showtime.showDate !== selectedShowDate) return false;
      return true;
    });
  }, [selectedCinemaId, selectedShowDate, sortedShowtimes]);

  const selectedShowtime = useMemo(
    () => filteredShowtimes.find((showtime) => showtime.id === selectedShowtimeId) || null,
    [filteredShowtimes, selectedShowtimeId]
  );

  useEffect(() => {
    if (!cinemaOptions.length) {
      setSelectedCinemaId('');
      return;
    }

    const preferredCinema = bookingShowtime?.movieId === movieId
      ? bookingShowtime.cinemaId
      : cinemaOptions[0].id;
    if (!cinemaOptions.some((item) => item.id === selectedCinemaId)) {
      setSelectedCinemaId(preferredCinema);
    }
  }, [bookingShowtime, cinemaOptions, movieId, selectedCinemaId]);

  useEffect(() => {
    if (!dateOptions.length) {
      setSelectedShowDate('');
      return;
    }

    if (!dateOptions.includes(selectedShowDate)) {
      const todayMatch = dateOptions.find((date) => date === todayIso);
      setSelectedShowDate(todayMatch || dateOptions[0]);
    }
  }, [dateOptions, selectedShowDate, todayIso]);

  useEffect(() => {
    if (!filteredShowtimes.length) {
      setSelectedShowtimeId('');
      return;
    }

    if (!filteredShowtimes.some((showtime) => showtime.id === selectedShowtimeId)) {
      const preferredShowtime = bookingShowtime?.movieId === movieId
        ? filteredShowtimes.find((showtime) => showtime.id === bookingShowtime.id)
        : null;
      setSelectedShowtimeId(preferredShowtime?.id || filteredShowtimes[0].id);
    }
  }, [bookingShowtime, filteredShowtimes, movieId, selectedShowtimeId]);

  const castText = useMemo(() => {
    if (!movie?.cast || movie.cast.length === 0) return t('cinema.updating');
    return movie.cast.join(', ');
  }, [movie, t]);

  const handleContinueToSeats = () => {
    if (!selectedShowtime) return;
    setSelectedShowtime(selectedShowtime);
    clearSeatSelection();
    clearCheckoutSession();
    navigate('/cinema/seats');
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
        <CinemaBookingProgress currentStep="movie" />

        <section className="cinema-detail-backdrop-shell">
          <CinemaImage
            src={movie.backdropUrl || movie.posterUrl}
            fallbackSrc={DEFAULT_CINEMA_BACKDROP_URL}
            alt={movie.title}
            className="cinema-detail-backdrop"
          />
          <div className="cinema-detail-backdrop-overlay" />

          <div className="cinema-detail-hero cinema-detail-hero-rich">
            <CinemaImage
              src={movie.posterUrl}
              fallbackSrc={DEFAULT_CINEMA_POSTER_URL}
              alt={movie.title}
              className="cinema-detail-poster"
            />
            <div className="cinema-detail-copy">
              <p className="cinema-section-eyebrow">{t('cinema.nowShowing')}</p>
              <h1 className="cinema-title">{movie.title}</h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="cinema-original-title">{movie.originalTitle}</p>
              )}
              <div className="cinema-detail-meta">
                <span>{movie.genre}</span>
                <span>{movie.runtime}</span>
                <span>{movie.ageRating || t('common.unknown')}</span>
                <span>{movie.releaseYear || t('common.unknown')}</span>
              </div>
              <p className="cinema-subtitle">{movie.synopsis || movie.shortSynopsis}</p>
            </div>
          </div>
        </section>

        <section className="cinema-section cinema-detail-layout">
          <article className="cinema-detail-panel">
            <h2>{t('cinema.movieInformation')}</h2>
            <div className="cinema-detail-info-grid">
              <div className="cinema-detail-info-item">
                <span>{t('cinema.genre')}</span>
                <strong>{movie.genre || t('common.unknown')}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>{t('cinema.runtime')}</span>
                <strong>{movie.runtime || '-'}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>{t('cinema.ageRating')}</span>
                <strong>{movie.ageRating || t('common.unknown')}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>{t('cinema.releaseYear')}</span>
                <strong>{movie.releaseYear || t('common.unknown')}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>{t('cinema.director')}</span>
                <strong>{movie.director || t('cinema.updating')}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>{t('cinema.cast')}</span>
                <strong>{castText}</strong>
              </div>
            </div>
          </article>

          <article className="cinema-detail-panel cinema-booking-summary">
            <h2>{t('cinema.selectShowtime')}</h2>
            <p className="cinema-booking-summary-note">{t('cinema.chooseCinemaDateShowtime')}</p>

            <div className="admin-form-grid" style={{ marginBottom: '14px' }}>
              <select
                className="field-control"
                value={selectedCinemaId}
                onChange={(event) => setSelectedCinemaId(event.target.value)}
              >
                {cinemaOptions.map((cinema) => (
                  <option key={cinema.id} value={cinema.id}>
                    {cinema.name} - {cinema.city}
                  </option>
                ))}
              </select>

              <select
                className="field-control"
                value={selectedShowDate}
                onChange={(event) => setSelectedShowDate(event.target.value)}
              >
                {dateOptions.map((showDate) => (
                  <option key={showDate} value={showDate}>
                    {formatDateLabel(showDate, locale)}
                  </option>
                ))}
              </select>
            </div>

            {filteredShowtimes.length === 0 ? (
              <p className="cinema-weekly-empty">{t('cinema.noShowtimes')}</p>
            ) : (
              <>
                <div className="cinema-option-grid">
                  {filteredShowtimes.map((showtime) => (
                    <button
                      key={showtime.id}
                      type="button"
                      className={`cinema-option${selectedShowtimeId === showtime.id ? ' is-active' : ''}`}
                      onClick={() => setSelectedShowtimeId(showtime.id)}
                    >
                      <strong>{showtime.startTime} - {showtime.endTime}</strong>
                      <span>{showtime.auditoriumName}</span>
                      <span>{formatCurrency(showtime.price)}</span>
                    </button>
                  ))}
                </div>

                <div className="cinema-actions" style={{ marginTop: '14px' }}>
                  <button type="button" className="btn btn-primary" onClick={handleContinueToSeats} disabled={!selectedShowtime}>
                    {t('cinema.ctaSelectSeats')}
                  </button>
                  <Link to={`/cinema/movie/${movie.id}/showtimes`} className="btn btn-outline">
                    {t('cinema.openFullShowtimePage')}
                  </Link>
                </div>
              </>
            )}
          </article>
        </section>
      </div>
    </div>
  );
}

export default CinemaMovieDetail;
