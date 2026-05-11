import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';

export function useHLSManager(videoRef, activeCandidate, attemptPlay, moveToNextCandidate, t) {
  const hlsRef = useRef(null);
  const [qualities, setQualities] = useState([]);
  const [activeQualityIndex, setActiveQualityIndex] = useState(-1);
  const [isHlsActive, setIsHlsActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !activeCandidate || activeCandidate.type === 'youtube') return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (activeCandidate.type === 'hls') {
      setIsHlsActive(true);
      if (Hls.isSupported()) {
        const hls = new Hls({ 
          enableWorker: true, 
          lowLatencyMode: true, 
          backBufferLength: 90 
        });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
          const parsed = (data.levels || []).map((level, index) => ({
            index,
            label: level.height ? `${level.height}p` : `Level ${index + 1}`,
          }));
          setQualities(parsed);
          setActiveQualityIndex(-1);
          attemptPlay();
        });

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data?.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn('[HLSManager] Network error, recovering...');
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            console.warn('[HLSManager] Media error, recovering...');
            hls.recoverMediaError();
          } else {
            console.error('[HLSManager] Fatal error, moving to next candidate', data);
            moveToNextCandidate(t('movie.playbackError') || 'Streaming failed.', data);
          }
        });

        hls.attachMedia(video);
        hls.loadSource(activeCandidate.src);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = activeCandidate.src;
        video.load();
        attemptPlay();
      } else {
        moveToNextCandidate(t('movie.invalidStreamSource') || 'HLS is not supported by this browser.');
      }
    } else {
      setIsHlsActive(false);
      setQualities([]);
      setActiveQualityIndex(-1);
      video.src = activeCandidate.src;
      video.load();
      attemptPlay();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeCandidate, attemptPlay, moveToNextCandidate, t, videoRef]);

  const setQuality = useCallback((index) => {
    setActiveQualityIndex(index);
    if (hlsRef.current) {
      hlsRef.current.currentLevel = index;
    }
  }, []);

  return { qualities, activeQualityIndex, setQuality, isHlsActive };
}
