import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import CinemaImage from '../components/CinemaImage';
import { formatCurrency } from '../utils/cinema';
import {
  DEFAULT_CINEMA_BACKDROP_URL,
  DEFAULT_CINEMA_POSTER_URL,
  fetchCinemaShowtimes,
  getTodayIsoDate,
} from '../utils/cinemaApi';

const formatDateLabel = (isoDate) => {
  if (!isoDate) return '-';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatWeekday = (isoDate) => {
  if (!isoDate) return '-';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', { weekday: 'short' });
};

const formatMonthDay = (isoDate) => {
  if (!isoDate) return '-';
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function CinemaMovieDetail() {
  const { movieId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [showtimes, setShowtimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCinemaId, setSelectedCinemaId] = useState('');
  const [selectedShowDate, setSelectedShowDate] = useState('');
  const [selectedShowtimeId, setSelectedShowtimeId] = useState('');
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
          setError(fetchError?.response?.data?.message || 'Unable to load movie showtimes.');
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
  }, [movieId]);

  const sortedShowtimes = useMemo(() => {
    return showtimes
      .slice()
      .sort((a, b) => `${a.showDate}-${a.startTime}`.localeCompare(`${b.showDate}-${b.startTime}`));
  }, [showtimes]);

  const movie = useMemo(() => {
    const first = sortedShowtimes[0];
    return first?.movie || null;
  }, [sortedShowtimes]);

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

  useEffect(() => {
    if (!cinemaOptions.length) {
      setSelectedCinemaId('');
      return;
    }

    if (!cinemaOptions.some((cinema) => cinema.id === selectedCinemaId)) {
      setSelectedCinemaId(cinemaOptions[0].id);
    }
  }, [cinemaOptions, selectedCinemaId]);

  const datesForSelectedCinema = useMemo(() => {
    const dateSet = new Set();

    sortedShowtimes.forEach((showtime) => {
      if (!selectedCinemaId || showtime.cinemaId === selectedCinemaId) {
        dateSet.add(showtime.showDate);
      }
    });

    return Array.from(dateSet).sort((a, b) => a.localeCompare(b));
  }, [sortedShowtimes, selectedCinemaId]);

  useEffect(() => {
    if (!datesForSelectedCinema.length) {
      setSelectedShowDate('');
      return;
    }

    if (!datesForSelectedCinema.includes(selectedShowDate)) {
      const todayMatch = datesForSelectedCinema.find((showDate) => showDate === todayIso);
      setSelectedShowDate(todayMatch || datesForSelectedCinema[0]);
    }
  }, [datesForSelectedCinema, selectedShowDate, todayIso]);

  const showtimesForBooking = useMemo(() => {
    return sortedShowtimes.filter((showtime) => {
      if (selectedCinemaId && showtime.cinemaId !== selectedCinemaId) return false;
      if (selectedShowDate && showtime.showDate !== selectedShowDate) return false;
      return true;
    });
  }, [sortedShowtimes, selectedCinemaId, selectedShowDate]);

  useEffect(() => {
    if (!showtimesForBooking.length) {
      setSelectedShowtimeId('');
      return;
    }

    if (!showtimesForBooking.some((showtime) => showtime.id === selectedShowtimeId)) {
      setSelectedShowtimeId(showtimesForBooking[0].id);
    }
  }, [showtimesForBooking, selectedShowtimeId]);

  const selectedShowtime = useMemo(() => {
    return showtimesForBooking.find((showtime) => showtime.id === selectedShowtimeId) || null;
  }, [showtimesForBooking, selectedShowtimeId]);

  const todayShowtimes = useMemo(
    () => sortedShowtimes.filter((showtime) => showtime.showDate === todayIso),
    [sortedShowtimes, todayIso]
  );

  const todayByCinema = useMemo(() => {
    const grouped = new Map();

    todayShowtimes.forEach((showtime) => {
      if (!grouped.has(showtime.cinemaId)) {
        grouped.set(showtime.cinemaId, {
          cinemaId: showtime.cinemaId,
          cinemaName: showtime.cinemaName,
          cinemaCity: showtime.cinemaCity,
          auditoriums: new Map(),
        });
      }

      const cinema = grouped.get(showtime.cinemaId);
      if (!cinema.auditoriums.has(showtime.auditoriumId)) {
        cinema.auditoriums.set(showtime.auditoriumId, {
          auditoriumName: showtime.auditoriumName,
          showtimes: [],
        });
      }

      cinema.auditoriums.get(showtime.auditoriumId).showtimes.push(showtime);
    });

    return Array.from(grouped.values())
      .map((cinema) => ({
        ...cinema,
        auditoriums: Array.from(cinema.auditoriums.values())
          .map((auditorium) => ({
            ...auditorium,
            showtimes: auditorium.showtimes.sort((a, b) => a.startTime.localeCompare(b.startTime)),
          }))
          .sort((a, b) => a.auditoriumName.localeCompare(b.auditoriumName)),
      }))
      .sort((a, b) => a.cinemaName.localeCompare(b.cinemaName));
  }, [todayShowtimes]);

  const upcomingAvailability = useMemo(() => {
    const grouped = new Map();

    sortedShowtimes
      .filter((showtime) => showtime.showDate > todayIso)
      .forEach((showtime) => {
        if (!grouped.has(showtime.showDate)) {
          grouped.set(showtime.showDate, []);
        }
        grouped.get(showtime.showDate).push(showtime);
      });

    return Array.from(grouped.entries())
      .map(([showDate, entries]) => {
        const cinemas = new Map();

        entries.forEach((entry) => {
          if (!cinemas.has(entry.cinemaId)) {
            cinemas.set(entry.cinemaId, {
              id: entry.cinemaId,
              name: entry.cinemaName,
              city: entry.cinemaCity,
              showtimes: [],
            });
          }
          cinemas.get(entry.cinemaId).showtimes.push(entry);
        });

        return {
          showDate,
          label: formatDateLabel(showDate),
          count: entries.length,
          cinemas: Array.from(cinemas.values())
            .map((cinema) => ({
              ...cinema,
              showtimes: cinema.showtimes.sort((a, b) => a.startTime.localeCompare(b.startTime)),
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
      })
      .sort((a, b) => a.showDate.localeCompare(b.showDate));
  }, [sortedShowtimes, todayIso]);

  const nextShowtimes = useMemo(
    () => sortedShowtimes.filter((showtime) => showtime.showDate >= todayIso).slice(0, 8),
    [sortedShowtimes, todayIso]
  );

  const castText = useMemo(() => {
    if (!movie?.cast || movie.cast.length === 0) return 'Updating';
    return movie.cast.join(', ');
  }, [movie]);

  const handleSelectShowtime = (showtime) => {
    setSelectedCinemaId(showtime.cinemaId);
    setSelectedShowDate(showtime.showDate);
    setSelectedShowtimeId(showtime.id);
  };

  const handleContinueToSeats = () => {
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
              <p className="cinema-section-eyebrow">Now Showing</p>
              <h1 className="cinema-title">{movie.title}</h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="cinema-original-title">{movie.originalTitle}</p>
              )}

              <div className="cinema-detail-meta">
                <span>{movie.genre}</span>
                <span>{movie.runtime}</span>
                <span>{movie.ageRating || 'TBA'}</span>
                <span>{movie.releaseYear || 'TBA'}</span>
                <span>{movie.language || 'Unknown'}</span>
              </div>

              <p className="cinema-subtitle">{movie.synopsis || movie.shortSynopsis}</p>

              <div className="cinema-actions">
                <a href="#movie-booking-planner" className="btn btn-primary">
                  Start Booking
                </a>
                <Link to={`/cinema/movie/${movie.id}/showtimes`} className="btn btn-outline">
                  {t('cinema.selectShowtime')}
                </Link>
                <Link to="/cinema/schedule" className="btn btn-outline">
                  {t('cinema.navSchedule')}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="cinema-section cinema-detail-layout">
          <article className="cinema-detail-panel">
            <h2>Movie Information</h2>
            <p>{movie.synopsis || movie.shortSynopsis}</p>
            <div className="cinema-detail-info-grid">
              <div className="cinema-detail-info-item">
                <span>Genre</span>
                <strong>{movie.genre || 'Unknown'}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>Runtime</span>
                <strong>{movie.runtime || '-'}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>Age Rating</span>
                <strong>{movie.ageRating || 'TBA'}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>Release Year</span>
                <strong>{movie.releaseYear || 'TBA'}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>Director</span>
                <strong>{movie.director || 'Updating'}</strong>
              </div>
              <div className="cinema-detail-info-item">
                <span>Cast</span>
                <strong>{castText}</strong>
              </div>
            </div>
          </article>

          <article className="cinema-detail-panel cinema-booking-summary">
            <h2>Booking Summary</h2>
            <p className="cinema-booking-summary-note">
              Choose cinema, date, and showtime below to continue directly to seat selection.
            </p>

            {!selectedShowtime ? (
              <p className="cinema-weekly-empty">{t('cinema.noShowtimes')}</p>
            ) : (
              <div className="cinema-booking-summary-list">
                <div className="cinema-booking-summary-item">
                  <span>Cinema</span>
                  <strong>{selectedShowtime.cinemaName}</strong>
                </div>
                <div className="cinema-booking-summary-item">
                  <span>Date</span>
                  <strong>{formatDateLabel(selectedShowtime.showDate)}</strong>
                </div>
                <div className="cinema-booking-summary-item">
                  <span>Showtime</span>
                  <strong>{selectedShowtime.startTime} - {selectedShowtime.endTime}</strong>
                </div>
                <div className="cinema-booking-summary-item">
                  <span>Auditorium</span>
                  <strong>{selectedShowtime.auditoriumName}</strong>
                </div>
                <div className="cinema-booking-summary-item">
                  <span>Ticket Price</span>
                  <strong>{formatCurrency(selectedShowtime.price)}</strong>
                </div>

                <div className="cinema-actions">
                  <button type="button" className="btn btn-primary" onClick={handleContinueToSeats}>
                    {t('cinema.ctaSelectSeats')}
                  </button>
                  <Link to={`/cinema/movie/${movie.id}/showtimes`} className="btn btn-outline">
                    Browse All Showtimes
                  </Link>
                </div>
              </div>
            )}
          </article>
        </section>

        <section id="movie-booking-planner" className="cinema-section cinema-booking-planner">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">Booking Flow</p>
              <h2 className="cinema-section-title">Choose Cinema - Date - Showtime</h2>
            </div>
            <span className="cinema-pill">{showtimesForBooking.length} showtimes for your selection</span>
          </div>

          <div className="cinema-step-grid">
            <article className="cinema-step-card">
              <h3>{t('cinema.selectCinema')}</h3>
              <div className="cinema-option-grid">
                {cinemaOptions.map((cinema) => (
                  <button
                    key={cinema.id}
                    type="button"
                    className={`cinema-option${selectedCinemaId === cinema.id ? ' is-active' : ''}`}
                    onClick={() => setSelectedCinemaId(cinema.id)}
                  >
                    <strong>{cinema.name}</strong>
                    <span>{cinema.city}</span>
                    <span>{cinema.showCount} showtimes</span>
                  </button>
                ))}
              </div>
            </article>

            <article className="cinema-step-card">
              <h3>{t('cinema.selectDate')}</h3>
              <div className="cinema-week-tabs compact">
                {datesForSelectedCinema.map((showDate) => (
                  <button
                    key={showDate}
                    type="button"
                    className={`cinema-week-tab${selectedShowDate === showDate ? ' is-active' : ''}`}
                    onClick={() => setSelectedShowDate(showDate)}
                  >
                    <span>{formatWeekday(showDate)}</span>
                    <strong>{formatMonthDay(showDate)}</strong>
                  </button>
                ))}
              </div>
            </article>

            <article className="cinema-step-card">
              <h3>{t('cinema.selectShowtime')}</h3>
              {showtimesForBooking.length === 0 ? (
                <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
              ) : (
                <div className="cinema-option-grid">
                  {showtimesForBooking.map((showtime) => (
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
              )}
            </article>
          </div>

          <div className="cinema-action-bar">
            <Link to={`/cinema/movie/${movie.id}/showtimes`} className="btn btn-outline">
              Open Full Showtime Page
            </Link>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleContinueToSeats}
              disabled={!selectedShowtime}
            >
              {t('cinema.ctaSelectSeats')}
            </button>
          </div>
        </section>

        <section className="cinema-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.todayLabel')}</p>
              <h2 className="cinema-section-title">Today by Cinema Branch</h2>
            </div>
            <span className="cinema-pill">{todayShowtimes.length} showtimes today</span>
          </div>

          {todayByCinema.length === 0 ? (
            <div className="cinema-empty">{t('cinema.noShowtimes')}</div>
          ) : (
            <div className="cinema-cinema-show-grid">
              {todayByCinema.map((cinema) => (
                <article key={cinema.cinemaId} className="cinema-cinema-show-card">
                  <h3>{cinema.cinemaName}</h3>
                  <p>{cinema.cinemaCity}</p>

                  <div className="cinema-cinema-show-list">
                    {cinema.auditoriums.map((auditorium) => (
                      <div key={`${cinema.cinemaId}-${auditorium.auditoriumName}`} className="cinema-cinema-show-row">
                        <span>{auditorium.auditoriumName}</span>
                        <div className="cinema-times-row">
                          {auditorium.showtimes.map((showtime) => (
                            <button
                              key={showtime.id}
                              type="button"
                              className={`cinema-time-chip${selectedShowtimeId === showtime.id ? ' is-active' : ''}`}
                              onClick={() => handleSelectShowtime(showtime)}
                            >
                              {showtime.startTime}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="cinema-section">
          <div className="cinema-section-header">
            <div>
              <p className="cinema-section-eyebrow">Upcoming</p>
              <h2 className="cinema-section-title">Upcoming Showtimes</h2>
            </div>
            <span className="cinema-pill">{nextShowtimes.length} next available slots</span>
          </div>

          {upcomingAvailability.length === 0 ? (
            <div className="cinema-empty">No upcoming showtimes after today.</div>
          ) : (
            <div className="cinema-weekly-availability-grid">
              {upcomingAvailability.map((day) => (
                <article key={day.showDate} className="cinema-weekly-availability-card">
                  <div className="cinema-weekly-head">
                    <div>
                      <strong>{day.label}</strong>
                      <p>{day.cinemas.length} branches</p>
                    </div>
                    <span>{day.count} shows</span>
                  </div>

                  <div className="cinema-weekly-list">
                    {day.cinemas.slice(0, 3).map((cinema) => (
                      <div key={`${day.showDate}-${cinema.id}`} className="cinema-weekly-movie cinema-weekly-movie-rich">
                        <div>
                          <span>{cinema.name}</span>
                          <small>{cinema.city}</small>
                        </div>
                        <div className="cinema-times-row">
                          {cinema.showtimes.slice(0, 3).map((showtime) => (
                            <button
                              key={showtime.id}
                              type="button"
                              className={`cinema-time-chip${selectedShowtimeId === showtime.id ? ' is-active' : ''}`}
                              onClick={() => handleSelectShowtime(showtime)}
                            >
                              {showtime.startTime}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default CinemaMovieDetail;
