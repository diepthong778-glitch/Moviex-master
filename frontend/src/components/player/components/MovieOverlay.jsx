import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

export function MovieOverlay({ safeMovie, isTrailerMode, isTrailerFallback, showControls, autoplayCountdown, onClose, t }) {
  const isVisible = showControls || autoplayCountdown !== null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="absolute top-0 left-0 right-0 p-8 flex items-start justify-between z-40 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none"
        >
          <div className="flex gap-6 items-start">
            <button 
              onClick={onClose} 
              className="text-white hover:text-red-500 hover:bg-white/10 p-3 rounded-full backdrop-blur transition-all duration-300 pointer-events-auto"
              aria-label="Close"
            >
              <ArrowLeft size={28} />
            </button>

            <div className="flex flex-col drop-shadow-xl mt-1">
              <h2 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
                {safeMovie.title}
              </h2>
              
              <div className="flex items-center gap-3 mt-2 text-sm font-medium">
                <span className="px-2 py-0.5 rounded bg-red-600/90 text-white backdrop-blur shadow-sm uppercase tracking-wider text-xs">
                  {isTrailerMode 
                    ? (t('movie.trailerPreview') || 'Trailer Preview') 
                    : isTrailerFallback 
                      ? (t('movie.trailerFallback') || 'Trailer Fallback') 
                      : (t('movie.streamingFull') || 'Full Movie')}
                </span>
                
                {safeMovie.quality && (
                  <span className="px-2 py-0.5 border border-white/20 rounded text-white/80 bg-black/40 backdrop-blur text-xs">
                    {safeMovie.quality}
                  </span>
                )}
                
                {safeMovie.year && (
                  <span className="text-white/70">{safeMovie.year}</span>
                )}
              </div>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white hover:bg-white/10 px-4 py-2 rounded-lg font-medium backdrop-blur transition-all pointer-events-auto text-sm"
          >
            Exit
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
