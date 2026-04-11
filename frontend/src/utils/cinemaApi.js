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

const posterCache = new Map();
const backdropCache = new Map();

const normalizeKey = (value) => String(value || '').trim().toLowerCase();

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

const hashText = (text) => {
  const value = String(text || '').trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) - hash) + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const seededColorSet = (title) => {
  const hash = hashText(title);
  const hueA = hash % 360;
  const hueB = (hueA + 46 + (hash % 37)) % 360;
  const hueC = (hueA + 170) % 360;
  return {
    colorA: `hsl(${hueA} 70% 32%)`,
    colorB: `hsl(${hueB} 74% 46%)`,
    colorC: `hsl(${hueC} 80% 24%)`,
  };
};

const toSeededImageDataUri = (title, type = 'poster') => {
  const cache = type === 'backdrop' ? backdropCache : posterCache;
  const key = `${type}:${String(title || '').trim().toLowerCase()}`;
  if (cache.has(key)) {
    return cache.get(key);
  }

  const safeTitle = String(title || 'JDWoMoviex Cinema').trim();
  const headline = safeTitle.length > 30 ? `${safeTitle.slice(0, 30)}...` : safeTitle;
  const subline = type === 'backdrop' ? 'NOW SHOWING' : 'JDWOMOVIEX CINEMA';
  const width = type === 'backdrop' ? 1280 : 720;
  const height = type === 'backdrop' ? 720 : 1080;
  const { colorA, colorB, colorC } = seededColorSet(safeTitle);

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${colorA}" />
      <stop offset="52%" stop-color="${colorB}" />
      <stop offset="100%" stop-color="${colorC}" />
    </linearGradient>
    <radialGradient id="g2" cx="0.8" cy="0.15" r="0.75">
      <stop offset="0%" stop-color="rgba(255,255,255,0.28)" />
      <stop offset="100%" stop-color="rgba(255,255,255,0)" />
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#g1)" />
  <rect width="${width}" height="${height}" fill="url(#g2)" />
  <rect x="${type === 'backdrop' ? 52 : 44}" y="${type === 'backdrop' ? 48 : 64}" width="${type === 'backdrop' ? width - 104 : width - 88}" height="${type === 'backdrop' ? height - 96 : height - 128}" rx="${type === 'backdrop' ? 24 : 28}" fill="rgba(9,12,21,0.38)" stroke="rgba(255,255,255,0.18)" />
  <text x="${type === 'backdrop' ? 92 : 84}" y="${type === 'backdrop' ? 170 : 250}" fill="rgba(255,255,255,0.82)" font-size="${type === 'backdrop' ? 32 : 30}" font-family="Arial, Helvetica, sans-serif" letter-spacing="2">${subline}</text>
  <text x="${type === 'backdrop' ? 92 : 84}" y="${type === 'backdrop' ? 272 : 402}" fill="#ffffff" font-size="${type === 'backdrop' ? 64 : 70}" font-family="Arial, Helvetica, sans-serif" font-weight="700">${headline}</text>
  <text x="${type === 'backdrop' ? 92 : 84}" y="${type === 'backdrop' ? 340 : 470}" fill="rgba(255,255,255,0.78)" font-size="${type === 'backdrop' ? 20 : 24}" font-family="Arial, Helvetica, sans-serif">Weekly schedule seed</text>
</svg>`.trim();

  const dataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  cache.set(key, dataUri);
  return dataUri;
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
  const titleSeed = showtime.movieTitle || fallbackMovie?.title || showtime.movieId;
  return (
    localOverride?.posterUrl
    || localOverride?.backdropUrl
    || showtime.posterUrl
    || fallbackMovie?.posterUrl
    || fallbackMovie?.poster
    || toSeededImageDataUri(titleSeed, 'poster')
    || DEFAULT_CINEMA_POSTER_URL
  );
};

const resolveBackdropUrl = (showtime, fallbackMovie) => {
  const localOverride = resolveLocalAssetOverride(showtime, fallbackMovie);
  const titleSeed = showtime.movieTitle || fallbackMovie?.title || showtime.movieId;
  return (
    localOverride?.backdropUrl
    || localOverride?.posterUrl
    || showtime.backdropUrl
    || fallbackMovie?.backdropUrl
    || fallbackMovie?.posterUrl
    || fallbackMovie?.poster
    || toSeededImageDataUri(titleSeed, 'backdrop')
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
    isSeeded: Boolean(showtime.isSeeded),
  };
};

const matchesShowtimeParams = (showtime, params = {}) => {
  const movieId = params.movieId ? String(params.movieId) : '';
  const cinemaId = params.cinemaId ? String(params.cinemaId) : '';
  const auditoriumId = params.auditoriumId ? String(params.auditoriumId) : '';
  const showDate = params.showDate ? String(params.showDate) : '';
  const fallbackMovie = movieId ? staticMoviesById.get(movieId) : null;
  const fallbackTitle = normalizeKey(fallbackMovie?.title);
  const showtimeTitle = normalizeKey(showtime.movieTitle || showtime.movie?.title);

  if (movieId && showtime.movieId !== movieId && (!fallbackTitle || showtimeTitle !== fallbackTitle)) return false;
  if (cinemaId && showtime.cinemaId !== cinemaId) return false;
  if (auditoriumId && showtime.auditoriumId !== auditoriumId) return false;
  if (showDate && showtime.showDate !== showDate) return false;
  return true;
};

const fetchShowtimeViewRows = async (params = {}) => {
  const response = await axios.get('/api/cinema/showtimes/view', { params });
  return Array.isArray(response.data) ? response.data : [];
};

export const fetchCinemaShowtimes = async (params = {}) => {
  let apiRows = await fetchShowtimeViewRows(params);

  if (!apiRows.length && params.movieId && staticMoviesById.has(String(params.movieId))) {
    const relaxedParams = { ...params, movieId: undefined };
    const fallbackRows = await fetchShowtimeViewRows(relaxedParams);
    apiRows = fallbackRows.filter((showtime) => matchesShowtimeParams(showtime, params));
  }

  const list = apiRows
    .map(normalizeShowtime)
    .filter((showtime) => matchesShowtimeParams(showtime, params));

  return list.sort((a, b) => {
    const dateCompare = String(a.showDate).localeCompare(String(b.showDate));
    if (dateCompare !== 0) return dateCompare;
    return String(a.startTime).localeCompare(String(b.startTime));
  });
};

export const fetchCinemaShowtimeDetail = async (showtimeId) => {
  const response = await axios.get(`/api/cinema/showtimes/${encodeURIComponent(showtimeId)}/view`);
  return normalizeShowtime(response.data || {});
};

export const quoteCinemaBooking = async ({ showtimeId, seatIds }) => {
  const response = await axios.post('/api/cinema/bookings/quote', {
    showtimeId,
    seatIds,
  });
  return response.data || {};
};

export const fetchCinemaPaymentSession = async (txnCode) => {
  const response = await axios.get(`/api/cinema/payments/public/transactions/${encodeURIComponent(txnCode)}`);
  return response.data || {};
};

export const fetchCinemas = async () => {
  let apiList = [];
  try {
    const response = await axios.get('/api/cinema/cinemas');
    apiList = Array.isArray(response.data) ? response.data : [];
  } catch {
    apiList = [];
  }

  const merged = new Map();

  cinemaBranches.forEach((cinema) => {
    merged.set(cinema.id, {
      id: cinema.id,
      name: cinema.name,
      address: cinema.address,
      city: cinema.city,
      active: true,
      features: Array.isArray(cinema.features) ? cinema.features : [],
    });
  });

  apiList.forEach((cinema) => {
    if (!cinema?.id) return;
    const staticCinema = staticCinemaById.get(cinema.id);
    merged.set(cinema.id, {
      id: cinema.id,
      name: cinema.name || staticCinema?.name || cinema.id,
      address: cinema.address || staticCinema?.address || '',
      city: cinema.city || staticCinema?.city || '',
      active: cinema.active !== false,
      features: cinema.features || staticCinema?.features || [],
    });
  });

  return Array.from(merged.values())
    .filter((cinema) => cinema.active !== false)
    .sort((left, right) => String(left.name).localeCompare(String(right.name)));
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
