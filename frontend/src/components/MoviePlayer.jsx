import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtube';

const isDirectVideoUrl = (url) => {
  if (!url) return false;
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(url);
};

const WATCH_PROGRESS_KEY = 'moviex.watch.progress';
const SUBTITLE_LANGUAGE_STORAGE_KEY = 'moviex.subtitle.language';
const YOUTUBE_PLAYER_TIMEOUT_MS = 4500;

const readProgressMap = () => {
  const raw = localStorage.getItem(WATCH_PROGRESS_KEY);
  if (!raw || raw === 'undefined' || raw === 'null') return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const writeProgressMap = (map) => {
  localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(map));
};

function MoviePlayer({ movie, startAtSeconds = null, onClose, moviesQueue = [], onPlayMovie, onProgress }) {
  const safeMovie = movie || {};
  const movieId = String(safeMovie.id || '').trim();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const { t, i18n } = useTranslation();
  const [resumeSeconds, setResumeSeconds] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [youtubeStatus, setYouTubeStatus] = useState('unavailable');
  const [subtitleEnabled, setSubtitleEnabled] = useState(
    () => localStorage.getItem('moviex.subtitle.enabled') !== 'false'
  );
  const [subtitleLanguage, setSubtitleLanguage] = useState(
    () => localStorage.getItem(SUBTITLE_LANGUAGE_STORAGE_KEY) || localStorage.getItem('moviex.language') || i18n.resolvedLanguage || 'en'
  );

  const playback = useMemo(() => {
    if (isDirectVideoUrl(safeMovie.videoUrl)) {
      return { type: 'video', src: safeMovie.videoUrl };
    }

    const trailerId = extractYouTubeVideoId(safeMovie.trailerUrl);
    if (trailerId) {
      const url = getYouTubeEmbedUrl(safeMovie.trailerUrl, {
        autoplay: 1,
        mute: 0,
        controls: 1,
        rel: 0,
        playsinline: 1,
      });
      return { type: 'youtube', src: url };
    }

    if (isDirectVideoUrl(safeMovie.trailerUrl)) {
      return { type: 'video', src: safeMovie.trailerUrl };
    }

    return { type: 'missing', src: '' };
  }, [safeMovie.trailerUrl, safeMovie.videoUrl]);

  const currentIndex = moviesQueue.findIndex((item) => item.id === movieId);
  const nextMovie = currentIndex >= 0 ? moviesQueue[currentIndex + 1] : null;
  const upNextList = moviesQueue.slice(Math.max(currentIndex, 0), Math.max(currentIndex, 0) + 6);

  // Warn if movie not found in queue (may indicate data inconsistency)
  if (moviesQueue.length > 0 && currentIndex < 0) {
    console.warn('[MoviePlayer] Selected movie not found in queue - may have stale data', {
      movieId,
      movieTitle: safeMovie.title,
      queueLength: moviesQueue.length,
      firstQueueIds: moviesQueue.slice(0, 3).map(m => ({ id: m.id, title: m.title })),
    });
  }

  useEffect(() => {
    if (!movieId || playback.type !== 'youtube' || !playback.src) {
      setYouTubeStatus('unavailable');
      return;
    }

    setYouTubeStatus('loading');
  }, [movieId, playback.src, playback.type]);

  useEffect(() => {
    if (youtubeStatus !== 'loading') return undefined;

    const timeoutId = window.setTimeout(() => {
      setYouTubeStatus((current) => (current === 'loading' ? 'failed' : current));
    }, YOUTUBE_PLAYER_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [youtubeStatus]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!movieId || playback.type !== 'video' || !video) return undefined;

    let lastSyncAt = 0;
    let lastServerSyncAt = 0;

    const persistProgress = (force = false) => {
      if (!Number.isFinite(video.currentTime) || !Number.isFinite(video.duration) || video.duration <= 0) {
        return;
      }

      const now = Date.now();
      if (!force && now - lastSyncAt < 4000) return;
      lastSyncAt = now;

      const payload = {
        currentTime: Math.floor(video.currentTime),
        duration: Math.floor(video.duration),
        updatedAt: now,
      };

      const nextMap = {
        ...readProgressMap(),
        [movieId]: payload,
      };
      writeProgressMap(nextMap);
      if (onProgress) onProgress(movieId, payload);

      if (force || now - lastServerSyncAt >= 10000) {
        lastServerSyncAt = now;
        axios.post('/api/history/save', {
          movieId,
          movieTitle: safeMovie.title,
          progress: payload.currentTime,
          duration: payload.duration,
        }).catch(() => {});
      }
    };

    const handleLoadedMetadata = () => {
      if (Number.isFinite(startAtSeconds)) {
        const clamped = Math.max(0, Math.min(startAtSeconds, Math.max(0, video.duration - 0.5)));
        video.currentTime = clamped;
        setResumeSeconds(clamped > 0 ? Math.floor(clamped) : null);
        return;
      }

      const saved = readProgressMap()[movieId];
      if (!saved || !saved.currentTime || !saved.duration) {
        setResumeSeconds(null);
        return;
      }

      if (saved.currentTime > 20 && saved.currentTime < video.duration - 10) {
        video.currentTime = saved.currentTime;
        setResumeSeconds(Math.floor(saved.currentTime));
      } else {
        setResumeSeconds(null);
      }
    };

    const handleTimeUpdate = () => persistProgress(false);
    const handlePause = () => persistProgress(true);
    const handleEnded = () => {
      persistProgress(true);
      if (nextMovie && onPlayMovie) {
        onPlayMovie(nextMovie);
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [movieId, nextMovie, onPlayMovie, onProgress, startAtSeconds, safeMovie.title]);

  useEffect(() => {
    const video = videoRef.current;
    if (!movieId || playback.type !== 'video' || !video || !video.textTracks) return;

    const tracks = Array.from(video.textTracks);
    if (!tracks.length) return;

    tracks.forEach((track) => {
      const sameLanguage = !track.language || track.language === subtitleLanguage;
      track.mode = subtitleEnabled && sameLanguage ? 'showing' : 'disabled';
    });
  }, [movieId, playback.type, subtitleEnabled, subtitleLanguage]);

  useEffect(() => {
    const syncFullscreenState = () => {
      const activeElement = document.fullscreenElement || document.webkitFullscreenElement;
      setIsFullscreen(Boolean(activeElement && containerRef.current && activeElement === containerRef.current));
    };

    document.addEventListener('fullscreenchange', syncFullscreenState);
    document.addEventListener('webkitfullscreenchange', syncFullscreenState);

    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreenState);
      document.removeEventListener('webkitfullscreenchange', syncFullscreenState);
    };
  }, []);

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    const activeElement = document.fullscreenElement || document.webkitFullscreenElement;
    const alreadyFullscreen = activeElement === container;

    try {
      setFullscreenError('');

      if (alreadyFullscreen) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        return;
      }

      if (container.requestFullscreen) {
        await container.requestFullscreen();
      } else if (container.webkitRequestFullscreen) {
        container.webkitRequestFullscreen();
      } else {
        setFullscreenError('Fullscreen is not supported in this browser.');
      }
    } catch (error) {
      setFullscreenError(error?.message || 'Fullscreen is not allowed.');
    }
  };

  const toggleSubtitles = () => {
    setSubtitleEnabled((current) => {
      const next = !current;
      localStorage.setItem('moviex.subtitle.enabled', String(next));
      return next;
    });
  };

  const handleLanguageChange = (event) => {
    const value = event.target.value;
    setSubtitleLanguage(value);
    localStorage.setItem(SUBTITLE_LANGUAGE_STORAGE_KEY, value);
  };

  if (!movieId) {
    return null;
  }

  return (
    <div className="player-modal-overlay" id="movie-player-modal" onClick={handleOverlayClick}>
      <div className="player-modal player-layout" ref={containerRef}>
        <div className="player-main">
          <div className="player-modal-header">
            <div>
              <h2 className="player-modal-title">{movie.title}</h2>
              {resumeSeconds && <p className="player-resume">{t('movie.resumeAt', { seconds: resumeSeconds })}</p>}
            </div>
            <button className="player-close-btn" onClick={onClose} aria-label={t('movie.closePlayer')}>
              x
            </button>
          </div>

          <div className="player-video-container">
            {playback.type === 'video' ? (
              <video ref={videoRef} src={playback.src} controls autoPlay playsInline>
                {movie.subtitleUrl && (
                  <track
                    kind="subtitles"
                    src={movie.subtitleUrl}
                    srcLang={subtitleLanguage}
                    label={t('movie.subtitleTrackLabel', { language: subtitleLanguage.toUpperCase() })}
                    default={subtitleEnabled}
                  />
                )}
                {t('movie.browserDoesNotSupportVideo')}
              </video>
            ) : playback.type === 'youtube' ? (
              youtubeStatus === 'failed' ? (
                <div style={{ color: 'var(--text-muted)', padding: '20px' }}>
                  {t('movie.noPlayableVideo')}
                </div>
              ) : (
                <iframe
                  className={`detail-trailer-frame${youtubeStatus === 'ready' ? ' is-ready' : ''}`}
                  src={playback.src}
                  title={`${movie.title} trailer`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  loading="lazy"
                  onLoad={() => setYouTubeStatus((current) => (current === 'loading' ? 'ready' : current))}
                  onError={() => setYouTubeStatus('failed')}
                />
              )
            ) : (
              <div style={{ color: 'var(--text-muted)', padding: '20px' }}>
                {t('movie.noPlayableVideo')}
              </div>
            )}
          </div>

          <div className="player-modal-info">
            <span className="movie-card-genre">{movie.genre}</span>
            <span className="movie-card-year">{movie.year}</span>
            {playback.type === 'video' && (
              <>
                <button className="btn btn-outline player-subtitle-btn" onClick={toggleSubtitles}>
                  {subtitleEnabled ? t('movie.subtitlesOn') : t('movie.subtitlesOff')}
                </button>
                <select
                  className="field-control player-language-select"
                  value={subtitleLanguage}
                  onChange={handleLanguageChange}
                  aria-label={t('movie.subtitleLanguage')}
                >
                  <option value="en">EN</option>
                  <option value="vi">VI</option>
                  <option value="ja">JA</option>
                  <option value="zh">ZH</option>
                  <option value="ko">KO</option>
                </select>
                <button type="button" className="btn btn-outline player-fullscreen-btn" onClick={toggleFullscreen}>
                  {isFullscreen ? t('movie.exitFullscreen') : t('movie.fullscreen')}
                </button>
              </>
            )}
            {nextMovie && onPlayMovie && (
              <button className="btn btn-outline player-next-btn" onClick={() => onPlayMovie(nextMovie)}>
                {t('movie.nextMovie', { title: nextMovie.title })}
              </button>
            )}
            {fullscreenError && <p className="player-error-text">{fullscreenError}</p>}
            <p className="player-description">{movie.description || t('movie.noSynopsis')}</p>
          </div>
        </div>

        <aside className="player-side-panel">
          <h3 className="player-side-title">{t('movie.upNext')}</h3>
          <div className="player-next-list">
            {upNextList.map((item) => (
              <button
                key={item.id}
                className={`player-next-item ${item.id === movie.id ? 'active' : ''}`}
                onClick={() => onPlayMovie && onPlayMovie(item)}
              >
                <span className="player-next-name">{item.title}</span>
                <span className="player-next-meta">
                  {item.genre} | {item.year}
                </span>
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default MoviePlayer;
