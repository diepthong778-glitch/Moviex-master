import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import MovieCard from './MovieCard';
import { cachedGet } from '../utils/api';

function MovieSearch({ onPlay }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchMovies = useCallback(async (keyword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await cachedGet('/api/movies/search', {
        ttlMs: 30000,
        cacheKey: `movie-search:${keyword.trim().toLowerCase()}`,
        config: {
          params: {
            title: keyword,
            page: 0,
            size: 20,
            sortBy: 'title',
            sortDir: 'asc',
          },
        },
      });
      setMovies(response?.content || []);
    } catch (err) {
      setError(t('movieSearch.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmed = query.trim();
      if (trimmed) {
        searchMovies(trimmed);
      } else {
        setMovies([]);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, searchMovies]);

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  return (
    <div className="movie-search">
      <div className="search-container">
        <input
          type="text"
          placeholder={t('movieSearch.placeholder')}
          value={query}
          onChange={handleInputChange}
          className="search-input"
        />
        {loading && <div className="loading">{t('movieSearch.searching')}</div>}
        {error && <div className="error">{error}</div>}
      </div>
      <div className="movies-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onPlay={onPlay} />
        ))}
      </div>
      {!loading && query && movies.length === 0 && <div className="no-results">{t('movieSearch.noResults')}</div>}
    </div>
  );
}

export default MovieSearch;
