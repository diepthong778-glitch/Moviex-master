import { useEffect } from 'react';

export function usePlayerHotkeys({ 
  togglePlay, 
  toggleFullscreen, 
  toggleMute, 
  skipForward, 
  skipBackward, 
  volume, 
  setVolume, 
  isYoutubePlayback 
}) {
  useEffect(() => {
    const onKeyDown = (event) => {
      // Ignore if typing in an input
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return;
      
      switch (event.code) {
        case 'Space':
        case 'KeyK':
          event.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          event.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          event.preventDefault();
          toggleMute();
          break;
        case 'ArrowRight':
          event.preventDefault();
          skipForward(10);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          skipBackward(10);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          event.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    togglePlay, 
    toggleFullscreen, 
    toggleMute, 
    skipForward, 
    skipBackward, 
    volume, 
    setVolume, 
    isYoutubePlayback
  ]);
}
