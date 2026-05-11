import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Maximize, Minimize, Settings, SkipForward, SkipBack, Subtitles } from 'lucide-react';
import { TimelineBar } from './TimelineBar';
import { VolumeControl } from './VolumeControl';

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  showControls,
  qualities,
  activeQualityIndex,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onSkipForward,
  onSkipBackward,
  onQualityChange,
  isYoutubePlayback
}) {
  return (
    <AnimatePresence>
      {showControls && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24 pb-6 px-8 z-40"
        >
          {!isYoutubePlayback && (
            <div className="mb-4">
              <TimelineBar currentTime={currentTime} duration={duration} onSeek={onSeek} />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {!isYoutubePlayback && (
                <>
                  <button 
                    onClick={onTogglePlay} 
                    className="text-white hover:text-red-500 hover:scale-110 transition-all duration-300 focus:outline-none"
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" />}
                  </button>

                  <div className="flex items-center gap-4 text-white">
                    <button onClick={() => onSkipBackward(10)} className="hover:text-red-500 transition-colors opacity-80 hover:opacity-100 focus:outline-none">
                      <SkipBack size={24} />
                    </button>
                    <button onClick={() => onSkipForward(10)} className="hover:text-red-500 transition-colors opacity-80 hover:opacity-100 focus:outline-none">
                      <SkipForward size={24} />
                    </button>
                  </div>

                  <VolumeControl volume={volume} isMuted={isMuted} setVolume={onVolumeChange} toggleMute={onToggleMute} />

                  <div className="text-white/80 font-medium tracking-wide text-sm select-none">
                    {formatTime(currentTime)} <span className="text-white/40 mx-1">/</span> {formatTime(duration)}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-5">
              {!isYoutubePlayback && qualities?.length > 0 && (
                <div className="relative group/quality">
                  <button className="text-white hover:text-red-500 transition-colors opacity-80 hover:opacity-100 p-2 focus:outline-none">
                    <Settings size={22} />
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 w-32 bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden opacity-0 invisible group-hover/quality:opacity-100 group-hover/quality:visible transition-all duration-300 origin-bottom">
                    <div className="flex flex-col py-1">
                      <button 
                        onClick={() => onQualityChange(-1)} 
                        className={`px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${activeQualityIndex === -1 ? 'text-red-500 font-bold' : 'text-white'}`}
                      >
                        Auto
                      </button>
                      {qualities.map((q) => (
                        <button 
                          key={q.index}
                          onClick={() => onQualityChange(q.index)} 
                          className={`px-4 py-2 text-sm text-left hover:bg-white/10 transition-colors ${activeQualityIndex === q.index ? 'text-red-500 font-bold' : 'text-white'}`}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button 
                onClick={onToggleFullscreen} 
                className="text-white hover:text-red-500 transition-colors opacity-80 hover:opacity-100 p-2 focus:outline-none"
                aria-label="Fullscreen"
              >
                {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
