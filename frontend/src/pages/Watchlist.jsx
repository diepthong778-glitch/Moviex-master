import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { authHeaders, cachedGet, invalidateApiCache } from '../utils/api';

function Watchlist() {
  const { getToken } = useAuth();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchWatchlist = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await cachedGet('/api/watchlist', {
        ttlMs: 10000,
        cacheKey: 'watchlist:me',
        config: {
          headers: authHeaders(getToken()),
        },
      });

      setMovies(data || []);
    } catch (err) {
      setError('Failed to load watchlist.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWatchlist();
  }, []);

  const removeMovie = async (movieId) => {
    try {
      const response = await axios.delete(`/api/watchlist/${movieId}`, {
        headers: authHeaders(getToken()),
      });
      setMovies(Array.isArray(response.data) ? response.data : []);
      invalidateApiCache('/api/watchlist');
    } catch (err) {
      setError('Failed to remove movie from watchlist.');
    }
  };

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">Watchlist</h2>
          <p className="page-subtitle">Saved movies for later</p>
        </div>
      </div>

      {loading && <p className="muted-text">Loading watchlist...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && !error && movies.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3 className="empty-title">Your watchlist is empty</h3>
        </div>
      )}

      <div className="watchlist-grid">
        {movies.map((movie) => (
          <div className="movie-tile" key={movie.id}>
            <h3>{movie.title}</h3>
            <p>{movie.genre}</p>
            <p>{movie.year}</p>
            <button className="btn btn-outline" onClick={() => removeMovie(movie.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Watchlist;
