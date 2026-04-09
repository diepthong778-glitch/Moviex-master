import axios from 'axios';
import { cinemaBranches, cinemaMovies } from '../data/cinemaData';

const staticMoviesById = new Map(cinemaMovies.map((movie) => [movie.id, movie]));
const staticMoviesByTitle = new Map(
  cinemaMovies
    .filter((movie) => movie?.title)
    .map((movie) => [String(movie.title).trim().toLowerCase(), movie])
);
const staticCinemaById = new Map(cinemaBranches.map((cinema) => [cinema.id, cinema]));
const localCinemaAssetOverrides = new Map([
  ['the martian', {
    posterUrl: '/posters/the-martian-poster.svg',
    backdropUrl: '/posters/the-martian-backdrop.svg',
  }],
]);

export const DEFAULT_CINEMA_POSTER_URL = '/posters/p1.svg';
export const DEFAULT_CINEMA_BACKDROP_URL = '/posters/p4.svg';

const resolveLocalAssetOverride = (showtime, fallbackMovie) => {
  const movieTitle = String(
    showtime?.movieTitle
      || fallbackMovie?.title
      || ''
  ).trim().toLowerCase();

  if (!movieTitle) {
    return null;
  }

  return localCinemaAssetOverrides.get(movieTitle) || null;
};

const toIsoDate = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const normalizeTime = (timeValue) => {
  if (!timeValue) return '';
  const raw = String(timeValue);
  if (!raw.includes(':')) return raw;
  const [hour, minute] = raw.split(':');
  if (hour == null || minute == null) return raw;
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
};

const normalizeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseRuntimeMinutes = (runtimeLabel) => {
  if (!runtimeLabel) return null;
  const match = String(runtimeLabel).match(/(\d+)/);
  if (!match) return null;
  const minutes = Number(match[1]);
  return Number.isFinite(minutes) ? minutes : null;
};

const toRuntimeLabel = (minutes) => {
  if (!minutes || minutes <= 0) return '-';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins} min`;
  return `${hours}h ${String(mins).padStart(2, '0')}m`;
};

const normalizeCast = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.filter((item) => item != null && String(item).trim().length > 0).map((item) => String(item).trim());
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
};

const toShortSynopsis = (text, maxLength = 170) => {
  if (!text) return '';
  const normalized = String(text).trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
};

const resolvePosterUrl = (showtime, fallbackMovie) => {
  const localOverride = resolveLocalAssetOverride(showtime, fallbackMovie);
  return (
    localOverride?.posterUrl
    || localOverride?.backdropUrl
    || showtime.posterUrl
    || fallbackMovie?.posterUrl
    || fallbackMovie?.poster
    || DEFAULT_CINEMA_POSTER_URL
  );
};

const resolveBackdropUrl = (showtime, fallbackMovie) => {
  const localOverride = resolveLocalAssetOverride(showtime, fallbackMovie);
  return (
    localOverride?.backdropUrl
    || localOverride?.posterUrl
    || showtime.backdropUrl
    || fallbackMovie?.backdropUrl
    || fallbackMovie?.posterUrl
    || fallbackMovie?.poster
    || DEFAULT_CINEMA_BACKDROP_URL
  );
};

const normalizeMovieMeta = (showtime) => {
  const fallbackMovie = staticMoviesById.get(showtime.movieId)
    || staticMoviesByTitle.get(String(showtime.movieTitle || '').trim().toLowerCase());
  const fallbackRuntimeMinutes = parseRuntimeMinutes(fallbackMovie?.runtime);
  const runtimeMinutes = normalizeNumber(showtime.durationMinutes, fallbackRuntimeMinutes || 0) || null;
  const synopsis = showtime.movieSynopsis || fallbackMovie?.synopsis || fallbackMovie?.description || '';

  return {
    id: showtime.movieId,
    title: showtime.movieTitle || fallbackMovie?.title || showtime.movieId || 'Unknown movie',
    originalTitle: showtime.movieOriginalTitle || fallbackMovie?.originalTitle || '',
    genre: showtime.movieGenre || fallbackMovie?.genre || 'Unknown',
    runtime: runtimeMinutes ? toRuntimeLabel(runtimeMinutes) : (fallbackMovie?.runtime || '-'),
    runtimeMinutes,
    ageRating: showtime.movieAgeRating || fallbackMovie?.ageRating || 'TBA',
    releaseYear: showtime.movieReleaseYear || fallbackMovie?.releaseYear || null,
    director: showtime.movieDirector || fallbackMovie?.director || 'Unknown',
    cast: normalizeCast(showtime.movieCast, fallbackMovie?.cast || []),
    language: showtime.movieLanguage || fallbackMovie?.language || 'Unknown',
    synopsis,
    shortSynopsis: toShortSynopsis(synopsis),
    posterUrl: resolvePosterUrl(showtime, fallbackMovie),
    backdropUrl: resolveBackdropUrl(showtime, fallbackMovie),
    isNowShowing: true,
  };
};

export const normalizeShowtime = (showtime) => {
  const showDate = showtime.showDate || '';
  const parsedDate = showDate ? new Date(`${showDate}T00:00:00`) : null;
  const dayIndex = parsedDate && !Number.isNaN(parsedDate.getTime())
    ? (parsedDate.getDay() === 0 ? 6 : parsedDate.getDay() - 1)
    : null;
  const movie = normalizeMovieMeta(showtime);

  return {
    id: showtime.id,
    movieId: showtime.movieId,
    movie,
    cinemaId: showtime.cinemaId,
    cinemaName: showtime.cinemaName || showtime.cinemaId,
    cinemaCity: showtime.cinemaCity || '',
    auditoriumId: showtime.auditoriumId,
    auditoriumName: showtime.auditoriumName || showtime.auditoriumId,
    showDate,
    dayIndex,
    startTime: normalizeTime(showtime.startTime),
    endTime: normalizeTime(showtime.endTime),
    price: normalizeNumber(showtime.basePrice, 0),
    status: showtime.status || 'SCHEDULED',
  };
};

export const fetchCinemaShowtimes = async (params = {}) => {
  const response = await axios.get('/api/cinema/showtimes/view', { params });
  const list = Array.isArray(response.data) ? response.data : [];
  return list.map(normalizeShowtime).sort((a, b) => {
    const dateCompare = String(a.showDate).localeCompare(String(b.showDate));
    if (dateCompare !== 0) return dateCompare;
    return String(a.startTime).localeCompare(String(b.startTime));
  });
};

export const fetchCinemaShowtimeDetail = async (showtimeId) => {
  const response = await axios.get(`/api/cinema/showtimes/${encodeURIComponent(showtimeId)}/view`);
  return normalizeShowtime(response.data || {});
};

export const fetchCinemas = async () => {
  const response = await axios.get('/api/cinema/cinemas');
  const list = Array.isArray(response.data) ? response.data : [];
  return list
    .filter((cinema) => cinema?.active !== false)
    .map((cinema) => {
      const staticCinema = staticCinemaById.get(cinema.id);
      return {
        id: cinema.id,
        name: cinema.name,
        address: cinema.address,
        city: cinema.city,
        active: cinema.active !== false,
        features: cinema.features || staticCinema?.features || [],
      };
    });
};

export const getMovieCatalogFromShowtimes = (showtimes = []) => {
  const byMovieId = new Map();
  showtimes.forEach((showtime) => {
    if (!showtime?.movieId || byMovieId.has(showtime.movieId)) return;
    byMovieId.set(showtime.movieId, showtime.movie);
  });
  return Array.from(byMovieId.values());
};

export const filterShowtimesByWeek = (showtimes, weekDates) => {
  const validDates = new Set((weekDates || []).map((item) => toIsoDate(item.date)));
  return (showtimes || []).filter((showtime) => validDates.has(showtime.showDate));
};

export const getTodayIsoDate = () => toIsoDate(new Date());

export const isoDateFromWeekDate = (date) => toIsoDate(date);
