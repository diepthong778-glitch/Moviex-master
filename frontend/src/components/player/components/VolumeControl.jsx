import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Volume1 } from 'lucide-react';

export function VolumeControl({ volume, isMuted, setVolume, toggleMute }) {
  const [isHovered, setIsHovered] = useState(false);
  const sliderRef = useRef(null);

  const handleDrag = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    // For horizontal slider:
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setVolume(percent);
  };

  const handlePointerDown = (e) => {
    handleDrag(e);
    const onPointerMove = (e) => handleDrag(e);
    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
  };

  const currentVolume = isMuted ? 0 : volume;

  let Icon = Volume2;
  if (currentVolume === 0) Icon = VolumeX;
  else if (currentVolume < 0.5) Icon = Volume1;

  return (
    <div 
      className="relative flex items-center group/volume"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button 
        className="text-white hover:text-red-500 transition-colors duration-300 p-2 focus:outline-none"
        onClick={toggleMute}
        aria-label={isMuted ? 'Unmute' : 'Mute'}
      >
        <Icon size={24} />
      </button>

      <AnimatePresence>
        {(isHovered || isMuted) && (
          <motion.div 
            initial={{ width: 0, opacity: 0, marginLeft: 0 }}
            animate={{ width: 80, opacity: 1, marginLeft: 8 }}
            exit={{ width: 0, opacity: 0, marginLeft: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex items-center overflow-hidden"
          >
            <div 
              ref={sliderRef}
              className="w-full h-1.5 bg-white/30 rounded-full cursor-pointer relative group-hover/slider:h-2 transition-all"
              onPointerDown={handlePointerDown}
            >
              <div 
                className="absolute left-0 top-0 bottom-0 bg-red-600 rounded-full"
                style={{ width: `${currentVolume * 100}%` }}
              />
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow shadow-black/50 opacity-0 group-hover/volume:opacity-100 transition-opacity pointer-events-none"
                style={{ left: `calc(${currentVolume * 100}% - 6px)` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
