import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../../utils/youtube';
import { resolvePosterUrl } from '../../utils/media';
import { getStoredToken } from '../../utils/api';

import { usePlaybackManager } from './hooks/usePlaybackManager';
import { usePlayerHotkeys } from './hooks/usePlayerHotkeys';

import { VideoSurface } from './components/VideoSurface';
import { PlayerControls } from './components/PlayerControls';
import { MovieOverlay } from './components/MovieOverlay';
import { PlayerSidebar } from './components/PlayerSidebar';
import { PlaybackErrorOverlay } from './components/PlaybackErrorOverlay';

// Helper functions (same as original, extracted for clarity)
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

export default function MoviePlayerController({ movie, startAtSeconds = null, onClose, moviesQueue = [], onPlayMovie, onProgress }) {
  const safeMovie = movie || {};
  const movieId = String(safeMovie.id || '').trim();
  const authToken = getStoredToken();
  const { t, i18n } = useTranslation();

  const containerRef = useRef(null);
  const videoRef = useRef(null); // Passed down to VideoSurface
  const controlsTimeoutRef = useRef(null);

  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [error, setError] = useState(null);
  const [activeCandidateIndex, setActiveCandidateIndex] = useState(0);
  const [retryNonce, setRetryNonce] = useState(0);

  // Audio/Quality states synced from VideoSurface
  const [volumeState, setVolumeState] = useState({ volume: 1, isMuted: true, setVolume: () => {}, toggleMute: () => {} });
  const [qualityState, setQualityState] = useState({ qualities: [], activeQualityIndex: -1, setQuality: () => {} });
  const [subtitleEnabled, setSubtitleEnabled] = useState(() => localStorage.getItem('moviex.subtitle.enabled') !== 'false');
  const [subtitleLanguage, setSubtitleLanguage] = useState(() => localStorage.getItem('moviex.subtitle.language') || i18n.resolvedLanguage || 'en');

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
        return { src, label, language: toLanguageCode(label, subtitleLanguage) };
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
      }
    }
    if (!isHlsLike(explicit, safeMovie.streamType)) {
      const proxySrc = buildProxyStreamUrl(movieId, authToken);
      if (proxySrc) {
        candidates.push({ id: `proxy:${proxySrc}`, origin: 'stream', type: 'video', src: proxySrc });
      }
    }
    return dedupeCandidates(candidates);
  }, [movieId, isTrailerMode, safeMovie.streamUrl, safeMovie.videoUrl, safeMovie.streamType, authToken]);

  const playbackCandidates = useMemo(() => {
    if (isTrailerMode) return trailerCandidate ? [trailerCandidate] : [];
    const list = [...streamCandidates];
    if (trailerCandidate) list.push({ ...trailerCandidate, id: `${trailerCandidate.id}:fallback`, origin: 'trailer-fallback' });
    return dedupeCandidates(list);
  }, [isTrailerMode, streamCandidates, trailerCandidate]);

  const activeCandidate = playbackCandidates[activeCandidateIndex] || null;
  const isYoutubePlayback = activeCandidate?.type === 'youtube';
  const isUnavailable = !activeCandidate;
  const isTrailerFallback = Boolean(!isTrailerMode && activeCandidate?.origin !== 'stream');

  const currentQueueIndex = useMemo(() => moviesQueue.findIndex((item) => String(item?.id || '').trim() === movieId), [moviesQueue, movieId]);
  const nextMovie = currentQueueIndex >= 0 ? moviesQueue[currentQueueIndex + 1] : null;

  const startNextMovie = useCallback(() => {
    if (!nextMovie) return;
    onPlayMovie(nextMovie);
  }, [nextMovie, onPlayMovie]);

  const moveToNextCandidate = useCallback((message, details = null) => {
    console.error('[MoviePlayer] Playback error', { movieId, message, details });
    const hasFallback = activeCandidateIndex < playbackCandidates.length - 1;
    if (hasFallback) {
      setError(null);
      setActiveCandidateIndex((v) => v + 1);
      setRetryNonce((v) => v + 1);
      return;
    }
    setError(message || (t('movie.playbackError') || 'Unable to play this title right now.'));
  }, [movieId, activeCandidateIndex, playbackCandidates.length, t]);

  const retryPlayback = useCallback(() => {
    setError(null);
    setActiveCandidateIndex(0);
    setRetryNonce((v) => v + 1);
  }, []);

  const triggerControls = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Hook Managers
  const {
    isPlaying,
    isBuffering,
    isReady,
    currentTime,
    duration,
    autoplayCountdown,
    togglePlay,
    seek,
    skipForward,
    skipBackward,
  } = usePlaybackManager(
    videoRef,
    activeCandidate,
    movieId,
    isTrailerMode,
    safeMovie,
    nextMovie,
    startNextMovie,
    onClose,
    moveToNextCandidate,
    t
  );

  usePlayerHotkeys({
    togglePlay,
    toggleFullscreen,
    toggleMute: volumeState.toggleMute,
    skipForward,
    skipBackward,
    volume: volumeState.volume,
    setVolume: volumeState.setVolume,
    isYoutubePlayback
  });

  if (!movieId) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-black text-white font-sans ${!showControls && isPlaying ? 'cursor-none' : ''}`}
      onMouseMove={triggerControls}
      onClick={triggerControls}
      ref={containerRef}
    >
      <MovieOverlay 
        safeMovie={safeMovie} 
        isTrailerMode={isTrailerMode} 
        isTrailerFallback={isTrailerFallback} 
        showControls={showControls} 
        autoplayCountdown={autoplayCountdown} 
        onClose={onClose} 
        t={t} 
      />

      <div className="absolute inset-0 flex">
        <main className="relative flex-1 bg-black overflow-hidden">
          <VideoSurface
            ref={videoRef}
            key={`${activeCandidate?.id}:${retryNonce}`}
            activeCandidate={activeCandidate}
            isYoutubePlayback={isYoutubePlayback}
            posterUrl={posterUrl}
            isReady={isReady}
            isBuffering={isBuffering}
            error={error}
            isUnavailable={isUnavailable}
            subtitleTracks={subtitleTracks}
            subtitleEnabled={subtitleEnabled}
            subtitleLanguage={subtitleLanguage}
            moveToNextCandidate={moveToNextCandidate}
            t={t}
            onQualitiesLoaded={setQualityState}
            onVolumeStateChange={setVolumeState}
          />

          <PlaybackErrorOverlay 
            error={error} 
            isUnavailable={isUnavailable} 
            trailerCandidate={trailerCandidate} 
            isTrailerMode={isTrailerMode} 
            retryPlayback={retryPlayback} 
            onPlayTrailer={() => onPlayMovie({ ...safeMovie, isTrailerOnly: true })} 
            t={t} 
          />

          <PlayerControls 
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volumeState.volume}
            isMuted={volumeState.isMuted}
            isFullscreen={isFullscreen}
            showControls={showControls}
            qualities={qualityState.qualities}
            activeQualityIndex={qualityState.activeQualityIndex}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onVolumeChange={volumeState.setVolume}
            onToggleMute={volumeState.toggleMute}
            onToggleFullscreen={toggleFullscreen}
            onSkipForward={skipForward}
            onSkipBackward={skipBackward}
            onQualityChange={qualityState.setQuality}
            isYoutubePlayback={isYoutubePlayback}
          />
        </main>

        <PlayerSidebar 
          moviesQueue={moviesQueue} 
          movieId={movieId} 
          onPlayMovie={onPlayMovie} 
          t={t} 
          isVisible={showControls && isFullscreen && moviesQueue.length > 0} 
        />
      </div>
    </div>
  );
}
