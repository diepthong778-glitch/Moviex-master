import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const WATCH_PROGRESS_KEY = 'moviex.watch.progress';

export function usePlaybackManager(videoRef, activeCandidate, movieId, isTrailerMode, safeMovie, nextMovie, onAutoplayNext, onClose, moveToNextCandidate, t) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [autoplayCountdown, setAutoplayCountdown] = useState(null);

  const lastProgressSecondRef = useRef(-1);
  const resumeTimeRef = useRef(0);
  const isYoutubePlayback = activeCandidate?.type === 'youtube';

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

    if (force || payload.currentTime % 10 === 0) {
      axios
        .post('/api/history/save', {
          movieId,
          movieTitle: safeMovie.title,
          progress: payload.currentTime,
          duration: payload.duration,
        })
        .catch((err) => console.warn('[PlaybackManager] Failed saving progress to API', err));
    }
  }, [movieId, safeMovie.title, isTrailerMode, isBuffering, videoRef]);

  // Load resume time initially
  useEffect(() => {
    if (!movieId) return;
    const saved = !isTrailerMode ? readProgressMap()[movieId] : null;
    resumeTimeRef.current = Number(saved?.currentTime || 0);
  }, [movieId, isTrailerMode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setIsBuffering(true);
    const onCanPlay = () => setIsBuffering(false);
    const onPlaying = () => {
      setIsBuffering(false);
      setIsReady(true);
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
      let msg = t('movie.playbackError') || 'Video failed to load.';
      if (code === 4) msg = t('movie.invalidStreamSource') || 'This stream source is not supported.';
      if (code === 2) msg = t('movie.networkStreamError') || 'Network error while loading stream.';
      moveToNextCandidate(msg, video.error);
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
  }, [movieId, activeCandidate, isYoutubePlayback, isTrailerMode, persistProgress, moveToNextCandidate, nextMovie, onClose, t, videoRef]);

  useEffect(() => {
    if (autoplayCountdown === null) return;
    if (autoplayCountdown === 0) {
      onAutoplayNext();
      return;
    }
    const timer = window.setTimeout(() => setAutoplayCountdown((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [autoplayCountdown, onAutoplayNext]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    if (video.paused) {
      video.play().catch(console.warn);
    } else {
      video.pause();
    }
  }, [isYoutubePlayback, videoRef]);

  const seek = useCallback((time) => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    video.currentTime = Math.max(0, Math.min(duration, time));
  }, [duration, isYoutubePlayback, videoRef]);

  const changePlaybackRate = useCallback((rate) => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, [isYoutubePlayback, videoRef]);

  const skipForward = useCallback((seconds = 10) => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    video.currentTime = Math.min(duration, video.currentTime + seconds);
  }, [duration, isYoutubePlayback, videoRef]);

  const skipBackward = useCallback((seconds = 10) => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    video.currentTime = Math.max(0, video.currentTime - seconds);
  }, [isYoutubePlayback, videoRef]);

  return {
    isPlaying,
    isBuffering,
    isReady,
    currentTime,
    duration,
    playbackRate,
    autoplayCountdown,
    cancelAutoplay: () => setAutoplayCountdown(null),
    togglePlay,
    seek,
    changePlaybackRate,
    skipForward,
    skipBackward,
    setIsReady,
    setIsBuffering
  };
}
