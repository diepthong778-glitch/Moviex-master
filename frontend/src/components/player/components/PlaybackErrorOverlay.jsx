import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, Film } from 'lucide-react';

export function PlaybackErrorOverlay({ error, isUnavailable, trailerCandidate, isTrailerMode, retryPlayback, onPlayTrailer, t }) {
  if (!error && !isUnavailable) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
    >
      <div className="bg-zinc-900/90 border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center flex flex-col items-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30 text-red-500">
          <AlertCircle size={32} />
        </div>
        
        <h3 className="text-xl font-bold text-white mb-2">
          {t('movie.playbackError') || 'Playback Failed'}
        </h3>
        
        <p className="text-white/70 mb-8 leading-relaxed">
          {error || (t('movie.unavailableFallback') || 'Movie currently unavailable.')}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
          <button 
            onClick={retryPlayback}
            className="flex items-center justify-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-xl hover:bg-gray-200 transition-colors shadow-lg"
          >
            <RefreshCw size={18} />
            {t('common.retry') || 'Retry'}
          </button>
          
          {trailerCandidate && !isTrailerMode && (
            <button 
              onClick={onPlayTrailer}
              className="flex items-center justify-center gap-2 bg-zinc-800 text-white font-semibold px-6 py-3 rounded-xl hover:bg-zinc-700 transition-colors border border-white/10"
            >
              <Film size={18} />
              {t('movie.watchTrailerInstead') || 'Watch Trailer'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
