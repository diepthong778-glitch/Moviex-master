import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IMAGE_FALLBACK, resolvePosterUrl } from '../utils/media';
import { getYouTubeThumbnail } from '../utils/youtube';

const isDirectVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
};

function MovieCardImpl({ movie, onPlay, progress }) {
  const { t } = useTranslation();
  const fallbackPoster = IMAGE_FALLBACK;
  const movieId = movie ? String(movie.id ?? movie._id ?? movie.movieId ?? '').trim() : '';
  const videoRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const previewStopTimerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [previewMode, setPreviewMode] = useState('idle'); // idle | video

  // Keep hover previews lightweight: use image thumbnail for YouTube trailers.
  const previewVideoSrc = useMemo(
    () => (isDirectVideoUrl(movie?.trailerUrl) ? movie.trailerUrl : ''),
    [movie?.trailerUrl]
  );
  const [posterSrc, setPosterSrc] = useState(() => (
    resolvePosterUrl(movie, fallbackPoster)
  ));
  const shouldPlayVideoPreview = Boolean(previewMode === 'video' && previewVideoSrc);

  useEffect(() => {
    const nextPoster = resolvePosterUrl(movie, fallbackPoster);
    setPosterSrc(nextPoster);
  }, [movie?.id, movie?._id, movie?.movieId, movie?.title, movie?.posterUrl, movie?.image, movie?.trailerUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!shouldPlayVideoPreview || !video) return undefined;

    video.currentTime = 0;
    video.play().catch(() => {});
    previewStopTimerRef.current = window.setTimeout(() => {
      setPreviewMode('idle');
    }, 8000);

    return () => {
      if (previewStopTimerRef.current) {
        window.clearTimeout(previewStopTimerRef.current);
        previewStopTimerRef.current = null;
      }
      video.pause();
      video.currentTime = 0;
    };
  }, [shouldPlayVideoPreview]);

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
      if (previewStopTimerRef.current) window.clearTimeout(previewStopTimerRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    setIsHovered(true);
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      if (previewVideoSrc) setPreviewMode('video');
    }, 500);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setPreviewMode('idle');
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (previewStopTimerRef.current) {
      window.clearTimeout(previewStopTimerRef.current);
      previewStopTimerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  const handlePlay = (event) => {
    event.stopPropagation();
    onPlay(resolvedMovie);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPlay(resolvedMovie);
    }
  };

  const progressPercent =
    progress?.duration > 0
      ? Math.min(100, Math.floor((progress.currentTime / progress.duration) * 100))
      : 0;

  if (!movie || !movieId) {
    return null;
  }

  const resolvedMovie = movie.id === movieId ? movie : { ...movie, id: movieId };

  return (
    <div
      className="group movie-card-premium mx-pressable flex w-full flex-col gap-3"
      id={`movie-card-${movieId}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handlePlay}
      onKeyDown={handleKeyDown}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      role="button"
      tabIndex={0}
      data-hovered={isHovered}
      aria-label={t('movie.openDetailsFor', { title: movie.title })}
    >
      <div className="movie-card-surface relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-carbon/60 shadow-card">
        {movie.hasFullMovie && (
          <div className="absolute left-3 top-3 z-10">
            <span className="cinema-pill">
              4K STREAM
            </span>
          </div>
        )}
        {shouldPlayVideoPreview ? (
          <video
            ref={videoRef}
            className="movie-card-media-asset h-full w-full object-cover"
            src={previewVideoSrc}
            poster={posterSrc || fallbackPoster}
            muted
            playsInline
            preload="none"
          />
        ) : (
          <img
            className="movie-card-media-asset h-full w-full object-cover"
            src={posterSrc || fallbackPoster}
            alt={movie.title}
            loading="lazy"
            onError={() => {
              if (posterSrc?.includes('maxresdefault')) {
                setPosterSrc(getYouTubeThumbnail(movie.trailerUrl, 'hqdefault'));
              } else {
                setPosterSrc(fallbackPoster);
              }
            }}
          />
        )}
        <div className="movie-card-overlay-layer absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="movie-card-overlay-content-premium absolute inset-0 flex items-end justify-between p-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate">Play</p>
            <h3 className="text-sm font-semibold text-white">{movie.title}</h3>
          </div>
          <span className="movie-card-cta inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
            </svg>
          </span>
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-white">{movie.title}</h3>
        <div className="text-xs text-slate">
          <span>{movie.genre}</span>
          {movie.year && <span className="mx-2 text-slate/60">|</span>}
          <span>{movie.year}</span>
        </div>
        {progressPercent > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-ember" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[11px] text-slate">{t('movie.watchedPercent', { percent: progressPercent })}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const MovieCard = memo(MovieCardImpl, (prevProps, nextProps) => {
  return prevProps.movie === nextProps.movie && prevProps.progress === nextProps.progress && prevProps.onPlay === nextProps.onPlay;
});
export default MovieCard;
