import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAudioManager } from '../hooks/useAudioManager';
import { useHLSManager } from '../hooks/useHLSManager';
import { VolumeX, Loader2 } from 'lucide-react';

export const VideoSurface = forwardRef(({
  activeCandidate,
  isYoutubePlayback,
  posterUrl,
  isReady,
  isBuffering,
  error,
  isUnavailable,
  subtitleTracks,
  subtitleEnabled,
  subtitleLanguage,
  attemptPlay,
  moveToNextCandidate,
  t,
  onQualitiesLoaded,
  onAutoplayBlocked,
  onVolumeStateChange
}, ref) => {
  const videoRef = useRef(null);
  
  // Forward the video ref to the parent so it can be passed to the PlaybackManager
  useImperativeHandle(ref, () => videoRef.current);

  const {
    volume,
    isMuted,
    isAutoplayBlocked,
    setVolume,
    toggleMute,
    attemptPlay: attemptPlayAudio
  } = useAudioManager(videoRef);

  const { qualities, activeQualityIndex, setQuality, isHlsActive } = useHLSManager(
    videoRef,
    activeCandidate,
    attemptPlayAudio,
    moveToNextCandidate,
    t
  );

  // Sync state upward
  useEffect(() => {
    if (onQualitiesLoaded) onQualitiesLoaded({ qualities, activeQualityIndex, setQuality });
  }, [qualities, activeQualityIndex, setQuality, onQualitiesLoaded]);

  useEffect(() => {
    if (onAutoplayBlocked) onAutoplayBlocked(isAutoplayBlocked);
  }, [isAutoplayBlocked, onAutoplayBlocked]);

  useEffect(() => {
    if (onVolumeStateChange) onVolumeStateChange({ volume, isMuted, setVolume, toggleMute });
  }, [volume, isMuted, setVolume, toggleMute, onVolumeStateChange]);

  // Apply subtitle tracks
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isYoutubePlayback) return;
    const tracks = video.textTracks;
    if (!tracks) return;
    for (let i = 0; i < tracks.length; i += 1) {
      const track = tracks[i];
      track.mode = subtitleEnabled && track.language?.toLowerCase() === subtitleLanguage.toLowerCase() ? 'showing' : 'disabled';
    }
  }, [subtitleEnabled, subtitleLanguage, subtitleTracks, isYoutubePlayback, activeCandidate]);


  return (
    <div className="absolute inset-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Background Poster Blur (Cinematic Ambient) */}
      <div 
        className="absolute inset-0 opacity-30 scale-110 blur-3xl pointer-events-none transition-opacity duration-1000"
        style={{
          backgroundImage: `url(${posterUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: isReady && !isBuffering ? 0 : 0.3
        }}
      />

      {/* Poster Backdrop */}
      {(!isReady || isBuffering || error || isUnavailable) && (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: isReady ? 0 : 1 }}
          className="absolute inset-0 z-10 bg-black"
        >
          <img src={posterUrl} alt="" className="w-full h-full object-contain opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        </motion.div>
      )}

      {/* Loading State */}
      <AnimatePresence>
        {isBuffering && !error && !isUnavailable && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute z-20 flex flex-col items-center justify-center text-white"
          >
            <Loader2 size={64} className="animate-spin text-red-600 mb-4" />
            <p className="text-sm font-medium tracking-widest uppercase text-white/80 animate-pulse">
              {t('movie.loadingStream') || 'Loading Stream...'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unmute Overlay if Autoplay blocked */}
      <AnimatePresence>
        {isAutoplayBlocked && !isBuffering && isReady && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-8 right-8 z-30"
          >
            <button 
              onClick={toggleMute}
              className="flex items-center gap-2 bg-red-600/90 hover:bg-red-600 backdrop-blur text-white px-6 py-3 rounded-full font-semibold shadow-2xl transition-transform hover:scale-105"
            >
              <VolumeX size={20} />
              <span>Tap to Unmute</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Element */}
      {!isYoutubePlayback && activeCandidate && (
        <video 
          ref={videoRef} 
          playsInline 
          preload="auto" 
          className="w-full h-full object-contain z-0 transition-opacity duration-700"
          style={{ opacity: isReady ? 1 : 0 }}
        >
          {subtitleTracks?.map((track, index) => (
            <track 
              key={`${track.src}-${index}`} 
              src={track.src} 
              kind="subtitles" 
              srcLang={track.language} 
              label={track.label} 
              default={subtitleEnabled && track.language === subtitleLanguage} 
            />
          ))}
        </video>
      )}

      {/* YouTube Iframe */}
      {isYoutubePlayback && activeCandidate && (
        <iframe
          src={activeCandidate.src}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          className="w-full h-full object-cover z-0"
          title="Trailer"
        />
      )}
    </div>
  );
});
