import { getYouTubeThumbnail } from './youtube';

const FALLBACK_POSTER = '/posters/movie-fallback.svg';
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL || '';
const LOCAL_POSTER_OVERRIDES = new Map([
  ['mvx-011', '/posters/the-martian-poster.svg'],
  ['the martian', '/posters/the-martian-poster.svg'],
]);

const applyBaseUrl = (url) => {
  if (!url) return '';
  const value = String(url).trim();
  if (!value) return '';
  if (value.startsWith('http')) return value;

  const base = IMAGE_BASE_URL ? IMAGE_BASE_URL.replace(/\/+$/, '') : '';
  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return base ? `${base}${normalizedPath}` : normalizedPath;
};

export const resolvePosterUrl = (item, fallback = FALLBACK_POSTER) => {
  if (!item) return fallback;

  const overrideKeys = [
    item.id,
    item._id,
    item.movieId,
    item.title,
    item.originalTitle,
    item.name,
  ].map((value) => String(value || '').trim().toLowerCase()).filter(Boolean);

  for (const key of overrideKeys) {
    const override = LOCAL_POSTER_OVERRIDES.get(key);
    if (override) return override;
  }

  const candidates = [
    item.poster,
    item.posterUrl,
    item.poster_path,
    item.backdrop,
    item.backdropUrl,
    item.backdrop_path,
    item.thumbnail,
    item.thumb,
    item.image,
    item.cover,
    item.coverUrl,
    item.still_path,
    item.profile_path,
  ];

  for (const candidate of candidates) {
    const url = applyBaseUrl(candidate);
    if (url) return url;
  }

  const ytThumb = getYouTubeThumbnail(item.trailerUrl);
  if (ytThumb) return ytThumb;

  return fallback;
};

export const withImageBase = applyBaseUrl;
export const IMAGE_FALLBACK = FALLBACK_POSTER;
