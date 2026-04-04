import { useState, useEffect } from 'react';
import axios from 'axios';
import MovieCard from './MovieCard';

function MovieSearch({ onPlay }) {
  const [query, setQuery] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (query.trim()) {
        searchMovies(query);
      } else {
        setMovies([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchMovies = async (keyword) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`/api/movies/search?title=${encodeURIComponent(keyword)}&page=0&size=20`);
      setMovies(response.data.content || []);
    } catch (err) {
      setError('Failed to fetch movies. Please try again.');
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  return (
    <div className="movie-search">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search for movies..."
          value={query}
          onChange={handleInputChange}
          className="search-input"
        />
        {loading && <div className="loading">Searching...</div>}
        {error && <div className="error">{error}</div>}
      </div>
      <div className="movies-grid">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onPlay={onPlay} />
        ))}
      </div>
      {!loading && query && movies.length === 0 && <div className="no-results">No movies found.</div>}
    </div>
  );
}

export default MovieSearch;
