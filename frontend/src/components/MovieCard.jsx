import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getYouTubeThumbnail } from '../utils/youtube';

const isDirectVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
};

function MovieCardImpl({ movie, onPlay, progress }) {
  const { t } = useTranslation();
  const fallbackPoster = '/posters/p1.svg';

  // Safety assertion: ensure movie object is valid
  if (!movie || !movie.id) {
    console.error('[MovieCard] Invalid movie prop - cannot render card', {
      hasMovie: !!movie,
      movieId: movie?.id,
      movieTitle: movie?.title,
    });
    return null;
  }

  const videoRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const previewStopTimerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [previewMode, setPreviewMode] = useState('idle'); // idle | video

  // Keep hover previews lightweight: use image thumbnail for YouTube trailers.
  const previewVideoSrc = useMemo(
    () => (isDirectVideoUrl(movie.trailerUrl) ? movie.trailerUrl : ''),
    [movie.trailerUrl]
  );
  const [posterSrc, setPosterSrc] = useState(() => (
    movie.posterUrl || movie.image || getYouTubeThumbnail(movie.trailerUrl) || fallbackPoster
  ));
  const shouldPlayVideoPreview = Boolean(previewMode === 'video' && previewVideoSrc);

  useEffect(() => {
    const nextPoster = movie.posterUrl || movie.image || getYouTubeThumbnail(movie.trailerUrl) || fallbackPoster;
    setPosterSrc(nextPoster);
  }, [movie.posterUrl, movie.image, movie.trailerUrl]);

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
    onPlay(movie);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPlay(movie);
    }
  };

  const progressPercent =
    progress?.duration > 0
      ? Math.min(100, Math.floor((progress.currentTime / progress.duration) * 100))
      : 0;

  return (
    <div
      className="group flex w-full flex-col gap-3"
      id={`movie-card-${movie.id}`}
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
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl border border-white/10 bg-carbon/60 shadow-card">
        {shouldPlayVideoPreview ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            src={previewVideoSrc}
            poster={posterSrc || fallbackPoster}
            muted
            playsInline
            preload="none"
          />
        ) : (
          <img
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
        <div className="absolute inset-0 flex items-end justify-between p-4 opacity-0 transition duration-300 group-hover:opacity-100">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate">Play</p>
            <h3 className="text-sm font-semibold text-white">{movie.title}</h3>
          </div>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur">
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
          {movie.year && <span className="mx-2 text-slate/60">•</span>}
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

const MovieCard = memo(MovieCardImpl);
export default MovieCard;
