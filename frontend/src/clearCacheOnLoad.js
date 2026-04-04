// Auto-clear cache on page load to sync with backend changes
if (typeof window !== 'undefined') {
  const LAST_CACHE_CLEAR = 'moviex.last_cache_clear';
  const NOW = Date.now();
  const lastClear = localStorage.getItem(LAST_CACHE_CLEAR);
  const CLEAR_INTERVAL = 60 * 1000; // Clear every 60 seconds

  if (!lastClear || NOW - parseInt(lastClear) > CLEAR_INTERVAL) {
    console.log('[CacheManager] Clearing old cache for fresh data...');

    // Clear all moviex related data
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('moviex.')) {
        localStorage.removeItem(key);
        console.log(`[CacheManager] Cleared: ${key}`);
      }
    });

    // Update last clear time
    localStorage.setItem(LAST_CACHE_CLEAR, NOW.toString());
    console.log('[CacheManager] Cache cleared successfully');
  }
}

