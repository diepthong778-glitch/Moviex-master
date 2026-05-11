import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import axios from 'axios';
import Hls from 'hls.js';
import { useTranslation } from 'react-i18next';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtube';
import { resolvePosterUrl } from '../utils/media';
import { getStoredToken } from '../utils/api';

const WATCH_PROGRESS_KEY = 'moviex.watch.progress';
const VOLUME_KEY = 'moviex.player.volume';
const SUBTITLE_LANGUAGE_STORAGE_KEY = 'moviex.subtitle.language';
const SUBTITLE_ENABLED_KEY = 'moviex.subtitle.enabled';

const readProgressMap = () => {
  try {
    const raw = localStorage.getItem(WATCH_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const writeProgressMap = (map) => {
  localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(map));
};

const normalizeMediaUrl = (value) => (typeof value === 'string' ? value.trim() : '');
const isAbsoluteHttpUrl = (value) => /^https?:\/\//i.test(value || '');
const isHlsLike = (src, streamType) => String(streamType || '').toUpperCase() === 'HLS' || src.toLowerCase().includes('.m3u8');
const isHttpsPage = () => typeof window !== 'undefined' && window.location.protocol === 'https:';
const isMixedContentBlocked = (src) => isHttpsPage() && /^http:\/\//i.test(src || '');

const buildProxyStreamUrl = (movieId, token) => {
  const safeId = String(movieId || '').trim();
  if (!safeId) return '';
  const base = `/api/stream/${encodeURIComponent(safeId)}`;
  const safeToken = String(token || '').trim();
  if (!safeToken) return base;
  return `${base}?token=${encodeURIComponent(safeToken)}`;
};

const toLanguageCode = (value, fallback = 'en') => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized.includes('-')) return normalized;
  return normalized.slice(0, 2) || fallback;
};

const dedupeCandidates = (candidates) => {
  const seen = new Set();
  return candidates.filter((candidate) => {
    const key = `${candidate.type}|${candidate.src}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const toPlaybackMessage = (code, t) => {
  if (code === 4) return t('movie.invalidStreamSource') || 'This stream source is not supported.';
  if (code === 2) return t('movie.networkStreamError') || 'Network error while loading stream.';
  return t('movie.playbackError') || 'Video failed to load.';
};

function MoviePlayer({ movie, startAtSeconds = null, onClose, moviesQueue = [], onPlayMovie, onProgress }) {
  const safeMovie = movie || {};
  const movieId = String(safeMovie.id || '').trim();
  const authToken = getStoredToken();
  const { t, i18n } = useTranslation();

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const resumeTimeRef = useRef(0);
  const lastProgressSecondRef = useRef(-1);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => Number(localStorage.getItem(VOLUME_KEY)) || 1);
  const [isMuted, setIsMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [playbackRate, setPlaybackRate] = useState(1);
  const [error, setError] = useState(null);
  const [qualities, setQualities] = useState([]);
  const [activeQualityIndex, setActiveQualityIndex] = useState(-1);
  const [subtitleEnabled, setSubtitleEnabled] = useState(() => localStorage.getItem(SUBTITLE_ENABLED_KEY) !== 'false');
  const [subtitleLanguage, setSubtitleLanguage] = useState(() => localStorage.getItem(SUBTITLE_LANGUAGE_STORAGE_KEY) || i18n.resolvedLanguage || 'en');
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  const posterUrl = useMemo(() => resolvePosterUrl(safeMovie), [safeMovie]);
  const isTrailerMode = Boolean(safeMovie.isTrailerOnly || !safeMovie.hasFullMovie);

  const subtitleTracks = useMemo(() => {
    const urls = Array.isArray(safeMovie.subtitleUrls) ? safeMovie.subtitleUrls : [];
    const labels = Array.isArray(safeMovie.subtitles) ? safeMovie.subtitles : [];
    return urls
      .map((url, index) => {
        const src = normalizeMediaUrl(url);
        if (!src) return null;
        const label = String(labels[index] || `Track ${index + 1}`);
        return {
          src,
          label,
          language: toLanguageCode(label, subtitleLanguage),
        };
      })
      .filter(Boolean);
  }, [safeMovie.subtitleUrls, safeMovie.subtitles, subtitleLanguage]);

  const trailerCandidate = useMemo(() => {
    const trailerUrl = normalizeMediaUrl(safeMovie.trailerUrl);
    if (!trailerUrl || isMixedContentBlocked(trailerUrl)) return null;
    const ytId = extractYouTubeVideoId(trailerUrl);
    if (ytId) {
      return {
        id: `trailer-yt:${ytId}`,
        origin: 'trailer',
        type: 'youtube',
        src: getYouTubeEmbedUrl(trailerUrl, { autoplay: 1, mute: 1, rel: 0, modestbranding: 1, playsinline: 1 }),
      };
    }
    return {
      id: `trailer:${trailerUrl}`,
      origin: 'trailer',
      type: isHlsLike(trailerUrl) ? 'hls' : 'video',
      src: trailerUrl,
    };
  }, [safeMovie.trailerUrl]);

  const streamCandidates = useMemo(() => {
    if (!movieId || isTrailerMode) return [];

    const explicit = normalizeMediaUrl(safeMovie.streamUrl || safeMovie.videoUrl);
    const candidates = [];

    if (explicit) {
      if (!isMixedContentBlocked(explicit) && (isAbsoluteHttpUrl(explicit) || explicit.startsWith('/'))) {
        candidates.push({
          id: `stream:${explicit}`,
          origin: 'stream',
          type: isHlsLike(explicit, safeMovie.streamType) ? 'hls' : 'video',
          src: explicit,
        });
      } else {
        console.warn('[MoviePlayer] Primary stream URL rejected', {
          movieId,
          explicit,
          blockedMixedContent: isMixedContentBlocked(explicit),
        });
      }
    }

    if (!isHlsLike(explicit, safeMovie.streamType)) {
      const proxySrc = buildProxyStreamUrl(movieId, authToken);
      if (proxySrc) {
        candidates.push({
          id: `proxy:${proxySrc}`,
          origin: 'stream',
          type: 'video',
          src: proxySrc,
        });
      }
    }

    return dedupeCandidates(candidates);
  }, [movieId, isTrailerMode, safeMovie.streamUrl, safeMovie.videoUrl, safeMovie.streamType, authToken]);

  const playbackCandidates = useMemo(() => {
    if (isTrailerMode) return trailerCandidate ? [trailerCandidate] : [];
    const list = [...streamCandidates];
    if (trailerCandidate) {
      list.push({ ...trailerCandidate, id: `${trailerCandidate.id}:fallback`, origin: 'trailer-fallback' });
    }
    return dedupeCandidates(list);
  }, [isTrailerMode, streamCandidates, trailerCandidate]);

  const activeCandidate = playbackCandidates[activeCandidateIndex] || null;
  const isYoutubePlayback = activeCandidate?.type === 'youtube';
  const isUnavailable = !activeCandidate;
  const isTrailerFallback = Boolean(!isTrailerMode && activeCandidate?.origin !== 'stream');

  const currentQueueIndex = useMemo(
    () => moviesQueue.findIndex((item) => String(item?.id || '').trim() === movieId),
    [moviesQueue, movieId]
  );
  const nextMovie = currentQueueIndex >= 0 ? moviesQueue[currentQueueIndex + 1] : null;

  const startNextMovie = useCallback(() => {
    if (!nextMovie) return;
    setAutoplayCountdown(null);
    onPlayMovie(nextMovie);
  }, [nextMovie, onPlayMovie]);

  const cancelAutoplay = useCallback(() => setAutoplayCountdown(null), []);

  const attemptAutoplay = useCallback(async (video) => {
    if (!video) return;
    try {
      await video.play();
      setIsPlaying(true);
      console.log('[MoviePlayer] Autoplay succeeded', { src: activeCandidate?.src, muted: video.muted });
      return;
    } catch (err) {
      console.warn('[MoviePlayer] Autoplay blocked, retrying muted', err);
    }

    try {
      video.muted = true;
      setIsMuted(true);
      await video.play();
      setIsPlaying(true);
      console.log('[MoviePlayer] Muted autoplay succeeded', { src: activeCandidate?.src });
    } catch (err) {
      setIsPlaying(false);
      console.warn('[MoviePlayer] Muted autoplay still blocked', err);
    }
  }, [activeCandidate?.src]);

  const persistProgress = useCallback((force = false) => {
    const video = videoRef.current;
    if (!video || !movieId || isTrailerMode || isBuffering || !Number.isFinite(video.currentTime)) return;

    const rounded = Math.floor(video.currentTime);
    if (!force && rounded === lastProgressSecondRef.current) return;
    lastProgressSecondRef.current = rounded;

    const payload = {
      currentTime: Math.max(0, rounded),
      duration: Math.floor(Number.isFinite(video.duration) ? video.duration : 0),
      updatedAt: Date.now(),
    };

    const nextMap = { ...readProgressMap(), [movieId]: payload };
    writeProgressMap(nextMap);
    if (onProgress) onProgress(movieId, payload);

    if (force || payload.currentTime % 10 === 0) {
      axios
        .post('/api/history/save', {
          movieId,
          movieTitle: safeMovie.title,
          progress: payload.currentTime,
          duration: payload.duration,
        })
        .catch((err) => console.warn('[MoviePlayer] Failed saving progress to API', { movieId, err }));
    }
  }, [movieId, onProgress, safeMovie.title, isTrailerMode, isBuffering]);

  const moveToNextCandidate = useCallback((message, details = null) => {
    console.error('[MoviePlayer] Playback error', {
      movieId,
      message,
      details,
      activeCandidate,
      activeCandidateIndex,
      playbackCandidates,
    });

    const hasFallback = activeCandidateIndex < playbackCandidates.length - 1;
    if (hasFallback) {
      setError(null);
      setIsReady(false);
      setIsBuffering(true);
      setCurrentTime(0);
      setDuration(0);
      setActiveCandidateIndex((value) => value + 1);
      setRetryNonce((value) => value + 1);
      return;
    }

    setIsBuffering(false);
    setIsReady(false);
    setError(message || (t('movie.playbackError') || 'Unable to play this title right now.'));
  }, [movieId, activeCandidate, activeCandidateIndex, playbackCandidates, t]);

  const retryPlayback = useCallback(() => {
    console.log('[MoviePlayer] Retrying playback', { movieId, playbackCandidates });
    setError(null);
    setIsReady(false);
    setIsBuffering(playbackCandidates.length > 0);
    setActiveCandidateIndex(0);
    setRetryNonce((value) => value + 1);
  }, [movieId, playbackCandidates]);

  const triggerControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!movieId) return;
    const saved = !isTrailerMode ? readProgressMap()[movieId] : null;
    const requested = Number.isFinite(startAtSeconds) ? Math.max(0, Math.floor(startAtSeconds)) : null;
    resumeTimeRef.current = requested ?? Number(saved?.currentTime || 0);

    setError(null);
    setIsReady(false);
    setIsBuffering(playbackCandidates.length > 0);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setQualities([]);
    setActiveQualityIndex(-1);
    setAutoplayCountdown(null);
    setActiveCandidateIndex(0);
    setRetryNonce((value) => value + 1);
    setShowControls(true);

    console.log('[MoviePlayer] Stream source resolution', {
      movieId,
      title: safeMovie.title,
      streamUrl: safeMovie.streamUrl,
      videoUrl: safeMovie.videoUrl,
      trailerUrl: safeMovie.trailerUrl,
      streamType: safeMovie.streamType,
      isTrailerMode,
      candidates: playbackCandidates,
    });

    if (!playbackCandidates.length) {
      setError(t('movie.unavailableFallback') || 'Movie currently unavailable.');
      setIsBuffering(false);
    }
  }, [movieId, safeMovie.title, safeMovie.streamUrl, safeMovie.videoUrl, safeMovie.trailerUrl, safeMovie.streamType, isTrailerMode, playbackCandidates, startAtSeconds, t]);

  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown === 0) {
      startNextMovie();
      return;
    }
    const timer = window.setTimeout(() => setAutoplayCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [autoplayCountdown, startNextMovie]);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeCandidate || isYoutubePlayback) return;

    video.volume = volume;
    video.muted = isMuted;
    video.playbackRate = playbackRate;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (activeCandidate.type === 'hls') {
      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 60 });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          const parsed = (data.levels || []).map((level, index) => ({
            index,
            label: level.height ? `${level.height}p` : `Level ${index + 1}`,
          }));
          setQualities(parsed);
          setActiveQualityIndex(-1);
          attemptAutoplay(video);
        });
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data?.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
            return;
          }
          moveToNextCandidate(t('movie.playbackError') || 'Streaming failed.', data);
        });
        hls.attachMedia(video);
        hls.loadSource(activeCandidate.src);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeCandidate.src;
        video.load();
        attemptAutoplay(video);
      } else {
        moveToNextCandidate(t('movie.invalidStreamSource') || 'HLS is not supported by this browser.');
      }
    } else {
      setQualities([]);
      setActiveQualityIndex(-1);
      video.src = activeCandidate.src;
      video.load();
      attemptAutoplay(video);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeCandidate, isYoutubePlayback, volume, isMuted, playbackRate, retryNonce, attemptAutoplay, moveToNextCandidate, t]);

  useEffect(() => {
    if (!isYoutubePlayback) return;
    setIsReady(true);
    setIsBuffering(false);
    setIsPlaying(true);
  }, [isYoutubePlayback, activeCandidate]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;

    const onPlay = () => {
      setIsPlaying(true);
      console.log('[MoviePlayer] Playback state: playing', { movieId, source: activeCandidate });
    };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsReady(true);
      setError(null);
    };
    const onDurationChange = () => {
      if (Number.isFinite(video.duration)) setDuration(video.duration);
    };
    const onLoadedMetadata = () => {
      if (!Number.isFinite(video.duration)) return;
      const resume = Number(resumeTimeRef.current || 0);
      if (!isTrailerMode && resume > 5 && resume < Math.max(10, video.duration - 10)) {
        video.currentTime = resume;
      }
    };
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime || 0);
      const rounded = Math.floor(video.currentTime || 0);
      if (rounded > 0 && rounded % 5 === 0) persistProgress(false);
    };
    const onEnded = () => {
      persistProgress(true);
      if (nextMovie) setAutoplayCountdown(10);
      else onClose();
    };
    const onError = () => {
      const code = video.error?.code || 0;
      setIsBuffering(false);
      moveToNextCandidate(toPlaybackMessage(code, t), video.error);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', onEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', onEnded);
      video.removeEventListener('error', onError);
    };
  }, [movieId, activeCandidate, isYoutubePlayback, isTrailerMode, persistProgress, moveToNextCandidate, nextMovie, onClose, t]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    const tracks = video.textTracks;
    if (!tracks) return;
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      track.mode = subtitleEnabled && track.language?.toLowerCase() === subtitleLanguage.toLowerCase() ? 'showing' : 'disabled';
    }
  }, [subtitleEnabled, subtitleLanguage, subtitleTracks.length, isYoutubePlayback, activeCandidate]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return;
      if (event.code === 'Space' || event.code === 'KeyK') {
        event.preventDefault();
        if (videoRef.current && !isYoutubePlayback) {
          if (videoRef.current.paused) videoRef.current.play().catch(() => {});
          else videoRef.current.pause();
        }
      }
      if (event.code === 'KeyF' && containerRef.current) {
        if (!document.fullscreenElement) containerRef.current.requestFullscreen().catch(() => {});
        else document.exitFullscreen().catch(() => {});
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isYoutubePlayback]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    if (video.paused) {
      video.play().catch((err) => console.warn('[MoviePlayer] Play action failed', err));
    } else {
      video.pause();
    }
  }, [isYoutubePlayback]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch((err) => console.warn('[MoviePlayer] Fullscreen failed', err));
      return;
    }
    document.exitFullscreen().catch((err) => console.warn('[MoviePlayer] Exit fullscreen failed', err));
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || Number.isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!movieId) return null;

  return (
    <div className="player-modal-overlay" onMouseMove={triggerControls}>
      <div className={`player-layout ${!showControls && isPlaying ? 'hide-cursor' : ''}`} ref={containerRef}>
        <main className={`player-main ${!isPlaying ? 'is-paused' : ''}`}>
          <header className="player-modal-header" style={{ opacity: showControls || autoplayCountdown !== null || !isPlaying ? 1 : 0 }}>
            <div>
              <h2 className="player-modal-title">{safeMovie.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="cinema-pill">
                  {isTrailerMode ? (t('movie.trailerPreview') || 'Trailer Preview') : isTrailerFallback ? (t('movie.trailerFallback') || 'Trailer Fallback') : (t('movie.streamingFull') || 'Full Movie')}
                </span>
                {safeMovie.quality && <span className="cinema-pill opacity-70">{safeMovie.quality}</span>}
              </div>
            </div>
            <button className="player-close-btn" onClick={onClose} aria-label="Close player">x</button>
          </header>

          <div className="player-video-container">
            {(!isReady || isBuffering || error || isUnavailable) && (
              <div className="player-poster-backdrop">
                <img src={posterUrl} alt="" className="player-poster-img" />
                <div className="player-poster-overlay" />
              </div>
            )}

            {isBuffering && !error && !isUnavailable && (
              <div className="player-loader-container">
                <div className="player-loading-skeleton">
                  <span className="player-loading-bar" />
                  <span className="player-loading-bar" />
                  <span className="player-loading-bar" />
                </div>
                <div className="player-loader loading-spinner" />
                <p className="mt-4 text-sm font-medium animate-pulse">{t('movie.loadingStream') || 'Optimizing stream...'}</p>
              </div>
            )}

            {isTrailerFallback && !error && (
              <div className="player-fallback-banner">
                {t('movie.unavailableFallback') || 'Movie currently unavailable. Playing trailer preview.'}
              </div>
            )}

            {(error || isUnavailable) && (
              <div className="player-error-overlay">
                <div className="player-error-card">
                  <div className="player-error-icon">!</div>
                  <h3 className="player-error-title">{t('movie.playbackError') || 'Playback failed'}</h3>
                  <p className="player-error-text">{error || (t('movie.unavailableFallback') || 'Movie currently unavailable.')}</p>
                  <div className="flex gap-3 justify-center mt-6">
                    <button className="btn btn-primary" onClick={retryPlayback}>{t('common.retry') || 'Retry'}</button>
                    {trailerCandidate && !isTrailerMode && (
                      <button className="btn btn-outline" onClick={() => onPlayMovie({ ...safeMovie, isTrailerOnly: true })}>
                        {t('movie.watchTrailerInstead') || 'Watch Trailer Instead'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isYoutubePlayback && activeCandidate ? (
              <iframe
                key={`${activeCandidate.id}:${retryNonce}`}
                src={activeCandidate.src}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                className="detail-trailer-frame is-ready"
                title={safeMovie.title || 'Trailer'}
                onLoad={() => {
                  setIsReady(true);
                  setIsBuffering(false);
                }}
              />
            ) : (
              <video ref={videoRef} autoPlay playsInline preload="auto" className={`player-video-element ${isReady ? 'is-visible' : ''}`}>
                {subtitleTracks.map((track, index) => (
                  <track key={`${track.src}-${index}`} src={track.src} kind="subtitles" srcLang={track.language} label={track.label} default={subtitleEnabled && track.language === subtitleLanguage} />
                ))}
              </video>
            )}
          </div>

          {(isReady || isYoutubePlayback) && !isUnavailable && (
            <div className="player-controls-overlay" style={{ opacity: showControls || !isPlaying ? 1 : 0 }}>
              {!isYoutubePlayback && (
                <div className="player-progress-container">
                  <div className="player-progress-wrap" onClick={(event) => {
                    const video = videoRef.current;
                    if (!video || !duration) return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const percent = (event.clientX - rect.left) / rect.width;
                    video.currentTime = Math.max(0, Math.min(duration, duration * percent));
                  }}>
                    <div className="player-progress-bg" />
                    <div className="player-progress-bar" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}>
                      <div className="player-progress-handle" />
                    </div>
                  </div>
                </div>
              )}

              <div className="player-actions-row">
                <div className="player-left-actions">
                  {!isYoutubePlayback && <button className="player-icon-btn main-play-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'}>{isPlaying ? 'Pause' : 'Play'}</button>}
                  {!isYoutubePlayback && <div className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</div>}
                </div>
                <div className="player-right-actions">
                  {!isYoutubePlayback && (
                    <select className="player-mini-select" value={playbackRate} onChange={(event) => {
                      const nextRate = Number.parseFloat(event.target.value);
                      setPlaybackRate(nextRate);
                      if (videoRef.current) videoRef.current.playbackRate = nextRate;
                    }}>
                      <option value="0.75">0.75x</option>
                      <option value="1">1x</option>
                      <option value="1.25">1.25x</option>
                      <option value="1.5">1.5x</option>
                    </select>
                  )}
                  {!isYoutubePlayback && qualities.length > 0 && (
                    <select className="player-mini-select" value={activeQualityIndex} onChange={(event) => {
                      const level = Number.parseInt(event.target.value, 10);
                      setActiveQualityIndex(level);
                      if (hlsRef.current) hlsRef.current.currentLevel = level;
                    }}>
                      <option value="-1">Auto</option>
                      {qualities.map((quality) => <option key={quality.index} value={quality.index}>{quality.label}</option>)}
                    </select>
                  )}
                  {!isYoutubePlayback && subtitleTracks.length > 0 && (
                    <>
                      <button className={`player-icon-btn ${!subtitleEnabled ? 'muted' : ''}`} onClick={() => {
                        const nextValue = !subtitleEnabled;
                        setSubtitleEnabled(nextValue);
                        localStorage.setItem(SUBTITLE_ENABLED_KEY, String(nextValue));
                      }}>CC</button>
                      {subtitleEnabled && (
                        <select className="player-mini-select" value={subtitleLanguage} onChange={(event) => {
                          const lang = event.target.value;
                          setSubtitleLanguage(lang);
                          localStorage.setItem(SUBTITLE_LANGUAGE_STORAGE_KEY, lang);
                        }}>
                          {subtitleTracks.map((track) => <option key={`${track.language}-${track.label}`} value={track.language}>{track.label}</option>)}
                        </select>
                      )}
                    </>
                  )}
                  <button className="player-icon-btn" onClick={toggleFullscreen} title="Fullscreen">
                    {isFullscreen ? 'Exit' : 'Full'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        <aside className="player-side-panel">
          <header className="player-side-header">
            <h3 className="player-side-title">{t('movie.upNext')}</h3>
            <span className="text-[10px] text-muted-text font-bold uppercase tracking-wider">{moviesQueue.length} {t('movie.items')}</span>
          </header>
          <div className="player-next-list scrollbar-slim">
            {moviesQueue.map((item, index) => {
              const itemId = String(item?.id || '').trim();
              const isActive = itemId === movieId;
              return (
                <button key={itemId || index} className={`player-next-item ${isActive ? 'active' : ''}`} onClick={() => onPlayMovie(item)}>
                  <div className="player-next-thumb">
                    <img src={resolvePosterUrl(item)} alt="" />
                    {isActive && <div className="player-playing-indicator"><span /><span /><span /></div>}
                  </div>
                  <div className="player-next-info">
                    <span className="player-next-name">{item.title}</span>
                    <span className="player-next-meta">{item.genre} | {item.year}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default MoviePlayer;
