import { useState, useEffect, useCallback, useRef } from 'react';

const VOLUME_KEY = 'moviex.player.volume';
const MUTED_KEY = 'moviex.player.muted';

export function useAudioManager(videoRef) {
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem(VOLUME_KEY)) || 1);
  const [isMuted, setIsMutedState] = useState(() => localStorage.getItem(MUTED_KEY) === 'true');
  const [isAutoplayBlocked, setIsAutoplayBlocked] = useState(false);
  const internalUpdateRef = useRef(false); // Prevent infinite loops

  // Sync state to video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!internalUpdateRef.current) {
        video.volume = volume;
        video.muted = isMuted;
    }
  }, [volume, isMuted, videoRef]);

  // Sync video element changes back to state (e.g. from native controls, though we hide them)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleVolumeChange = () => {
      internalUpdateRef.current = true;
      if (video.volume !== volume) {
        setVolumeState(video.volume);
        localStorage.setItem(VOLUME_KEY, video.volume);
      }
      if (video.muted !== isMuted) {
        setIsMutedState(video.muted);
        localStorage.setItem(MUTED_KEY, video.muted);
      }
      // reset flag after state updates
      setTimeout(() => { internalUpdateRef.current = false; }, 0);
    };

    video.addEventListener('volumechange', handleVolumeChange);
    return () => video.removeEventListener('volumechange', handleVolumeChange);
  }, [volume, isMuted, videoRef]);

  const setVolume = useCallback((newVolume) => {
    const val = Math.max(0, Math.min(1, newVolume));
    setVolumeState(val);
    localStorage.setItem(VOLUME_KEY, val);
    
    if (val > 0 && isMuted) {
      setIsMutedState(false);
      localStorage.setItem(MUTED_KEY, 'false');
    } else if (val === 0 && !isMuted) {
      setIsMutedState(true);
      localStorage.setItem(MUTED_KEY, 'true');
    }
    
    if (videoRef.current) {
      videoRef.current.volume = val;
    }
  }, [isMuted, videoRef]);

  const toggleMute = useCallback(() => {
    setIsMutedState((prev) => {
      const next = !prev;
      localStorage.setItem(MUTED_KEY, next);
      if (!next && isAutoplayBlocked) {
        setIsAutoplayBlocked(false); // Unmuting clears the block flag
      }
      if (videoRef.current) {
         videoRef.current.muted = next;
      }
      return next;
    });
  }, [videoRef, isAutoplayBlocked]);

  // Handle Play Promise to detect autoplay restrictions
  const attemptPlay = useCallback(async () => {
    const video = videoRef.current;
    if (!video) return false;

    try {
      // First attempt: with user's preferred audio settings
      video.muted = isMuted;
      video.volume = volume;
      await video.play();
      setIsAutoplayBlocked(false);
      return true;
    } catch (error) {
      console.warn('[AudioManager] Play blocked, attempting muted fallback.', error);
      try {
        video.muted = true;
        await video.play();
        // Muted autoplay succeeded
        setIsMutedState(true);
        setIsAutoplayBlocked(true);
        return true;
      } catch (fallbackError) {
        console.error('[AudioManager] Muted autoplay also failed.', fallbackError);
        return false;
      }
    }
  }, [isMuted, volume, videoRef]);

  return {
    volume,
    isMuted,
    isAutoplayBlocked,
    setVolume,
    toggleMute,
    attemptPlay
  };
}
