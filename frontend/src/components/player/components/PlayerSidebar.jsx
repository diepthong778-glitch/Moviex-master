import { motion, AnimatePresence } from 'framer-motion';
import { resolvePosterUrl } from '../../../utils/media';

export function PlayerSidebar({ moviesQueue, movieId, onPlayMovie, t, isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && moviesQueue?.length > 0 && (
        <motion.aside
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="w-80 bg-black/80 backdrop-blur-xl border-l border-white/10 flex flex-col z-40"
        >
          <header className="p-6 pb-4 border-b border-white/10">
            <h3 className="text-white font-bold text-lg tracking-wide">{t('movie.upNext') || 'Up Next'}</h3>
            <p className="text-xs text-white/50 uppercase tracking-widest mt-1 font-semibold">
              {moviesQueue.length} {t('movie.items') || 'Items'}
            </p>
          </header>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-slim">
            {moviesQueue.map((item, index) => {
              const itemId = String(item?.id || '').trim();
              const isActive = itemId === movieId;
              
              return (
                <button 
                  key={itemId || index} 
                  onClick={() => onPlayMovie(item)}
                  className={`w-full text-left flex gap-4 p-2 rounded-xl transition-all duration-300 group ${isActive ? 'bg-white/10 shadow-lg' : 'hover:bg-white/5'}`}
                >
                  <div className="w-20 h-28 shrink-0 rounded-lg overflow-hidden relative shadow-md">
                    <img 
                      src={resolvePosterUrl(item)} 
                      alt="" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                    />
                    {isActive && (
                      <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center backdrop-blur-[2px]">
                        <div className="flex gap-1">
                          <motion.span animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0 }} className="w-1 h-3 bg-red-500 rounded-full" />
                          <motion.span animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }} className="w-1 h-3 bg-red-500 rounded-full" />
                          <motion.span animate={{ scaleY: [1, 2, 1] }} transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }} className="w-1 h-3 bg-red-500 rounded-full" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col justify-center flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm truncate ${isActive ? 'text-red-400' : 'text-white group-hover:text-red-400'} transition-colors`}>
                      {item.title}
                    </h4>
                    <p className="text-xs text-white/50 mt-1 truncate">
                      {item.genre}
                    </p>
                    <p className="text-xs text-white/40 mt-0.5">
                      {item.year}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
