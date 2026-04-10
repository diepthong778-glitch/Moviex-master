import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import { formatCurrency } from '../utils/cinema';
import {
  DEFAULT_CINEMA_POSTER_URL,
  fetchCinemaShowtimes,
  getTodayIsoDate,
} from '../utils/cinemaApi';

function CinemaNowShowing() {
  const { t } = useTranslation();
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCinemaId, setSelectedCinemaId] = useState('');

  const todayIso = useMemo(() => getTodayIsoDate(), []);

  useEffect(() => {
    let ignore = false;

    const loadNowShowing = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCinemaShowtimes({ showDate: todayIso });
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
  }, [todayIso]);

  const cinemaOptions = useMemo(() => {
    const byId = new Map();
    showtimes.forEach((showtime) => {
      if (byId.has(showtime.cinemaId)) return;
      byId.set(showtime.cinemaId, {
        id: showtime.cinemaId,
        name: showtime.cinemaName,
        city: showtime.cinemaCity,
      });
    });
    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [showtimes]);

  const filteredShowtimes = useMemo(() => {
    if (!selectedCinemaId) return showtimes;
    return showtimes.filter((showtime) => showtime.cinemaId === selectedCinemaId);
  }, [showtimes, selectedCinemaId]);

  const nowShowing = useMemo(() => {
    const grouped = new Map();
    filteredShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.movieId)) {
        grouped.set(showtime.movieId, []);
      }
      grouped.get(showtime.movieId).push(showtime);
    });

    return Array.from(grouped.values()).map((entries) => {
      const sorted = entries.slice().sort((a, b) => a.startTime.localeCompare(b.startTime));
      return {
        movie: sorted[0].movie,
        firstShowtime: sorted[0],
        times: sorted.map((item) => item.startTime),
        cinemaCount: new Set(sorted.map((item) => item.cinemaId)).size,
        showtimeCount: sorted.length,
      };
    });
  }, [filteredShowtimes]);

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
          <select value={selectedCinemaId} onChange={(event) => setSelectedCinemaId(event.target.value)}>
            <option value="">{t('cinema.allBranches')}</option>
            {cinemaOptions.map((cinema) => (
              <option key={cinema.id} value={cinema.id}>{cinema.name}</option>
            ))}
          </select>
          <div className="cinema-results-strip">
            <span>{t('cinema.moviesCount', { count: nowShowing.length })}</span>
            <span>{t('cinema.showtimesCount', { count: filteredShowtimes.length })}</span>
          </div>
        </div>

        {loading ? (
          <p className="cinema-empty">{t('common.loading')}</p>
        ) : error ? (
          <p className="cinema-empty">{error}</p>
        ) : nowShowing.length === 0 ? (
          <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
        ) : (
          <div className="cinema-now-grid">
            {nowShowing.map(({ movie, firstShowtime, times, showtimeCount, cinemaCount }) => (
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
                        {times.slice(0, 5).map((time) => (
                          <span key={`${movie.id}-${time}`} className="cinema-time-mini">{time}</span>
                        ))}
                        {times.length > 5 && <span className="cinema-time-mini">+{times.length - 5}</span>}
                      </div>
                    </div>
                    <div className="cinema-info-block">
                      <p className="cinema-info-label">{t('cinema.cinemaBranches')}</p>
                      <p className="cinema-info-value">
                        {t('cinema.branchShowSummary', { branchCount: cinemaCount, showCount: showtimeCount })}
                      </p>
                    </div>
                  </div>

                  <div className="cinema-card-actions">
                    <span className="cinema-pill">
                      {`${formatCurrency(firstShowtime.price)} • ${firstShowtime.startTime}`}
                    </span>
                    <Link to={`/cinema/movie/${movie.id}`} className="btn btn-primary cinema-compact-btn">
                      {t('cinema.ctaSelectSeats')}
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
