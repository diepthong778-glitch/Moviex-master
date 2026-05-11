import { useRef, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TimelineBar({ currentTime, duration, onSeek }) {
  const containerRef = useRef(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);
  const [hoverPercent, setHoverPercent] = useState(null);

  const calculateTimeFromEvent = useCallback((e) => {
    if (!containerRef.current || !duration) return 0;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return percent * duration;
  }, [duration]);

  const handlePointerDown = (e) => {
    setIsScrubbing(true);
    const newTime = calculateTimeFromEvent(e);
    setScrubTime(newTime);
    onSeek(newTime);
  };

  useEffect(() => {
    if (!isScrubbing) return;
    
    const onPointerMove = (e) => {
      const newTime = calculateTimeFromEvent(e);
      setScrubTime(newTime);
      onSeek(newTime); // realtime seeking, maybe throttle in production but HLS can handle it
    };
    
    const onPointerUp = () => {
      setIsScrubbing(false);
    };
    
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
  }, [isScrubbing, calculateTimeFromEvent, onSeek]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setHoverPercent(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)));
  };

  const displayTime = isScrubbing ? scrubTime : currentTime;
  const progressPercent = duration ? (displayTime / duration) * 100 : 0;

  return (
    <div 
      className="relative w-full h-8 flex items-center group cursor-pointer"
      onPointerDown={handlePointerDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoverPercent(null)}
      ref={containerRef}
    >
      {/* Background Track */}
      <div className="w-full h-1.5 bg-white/20 rounded-full relative overflow-hidden transition-all duration-300 group-hover:h-2">
        {/* Hover Track */}
        {hoverPercent !== null && (
          <div 
            className="absolute left-0 top-0 bottom-0 bg-white/30"
            style={{ width: `${hoverPercent * 100}%` }}
          />
        )}
        {/* Progress Track */}
        <div 
          className="absolute left-0 top-0 bottom-0 bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.8)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Scrubber Handle */}
      <motion.div 
        className="absolute w-4 h-4 bg-white rounded-full shadow-lg shadow-black/50 pointer-events-none z-10"
        style={{ left: `calc(${progressPercent}% - 8px)` }}
        initial={{ scale: 0 }}
        animate={{ scale: isScrubbing || hoverPercent !== null ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      />

      {/* Time Tooltip */}
      {hoverPercent !== null && (
        <div 
          className="absolute bottom-6 -translate-x-1/2 bg-black/80 backdrop-blur-md text-white text-xs px-2 py-1 rounded shadow-lg border border-white/10 pointer-events-none"
          style={{ left: `${hoverPercent * 100}%` }}
        >
          {formatTime(hoverPercent * duration)}
        </div>
      )}
    </div>
  );
}
