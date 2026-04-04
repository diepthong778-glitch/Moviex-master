import { useEffect, useState } from 'react';
import axios from 'axios';
import { cachedGet, invalidateApiCache } from '../utils/api';

const emptyForm = {
  title: '',
  genre: '',
  year: '',
  description: '',
  videoUrl: '',
  trailerUrl: '',
  requiredSubscription: 'BASIC',
};

function Admin() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const data = await cachedGet('/api/movies/search', {
        ttlMs: 10000,
        cacheKey: 'admin:movies',
        config: {
          params: {
            page: 0,
            size: 200,
            sortBy: 'title',
            sortDir: 'asc',
          },
        },
      });
      setMovies(Array.isArray(data?.content) ? data.content : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const isEditing = Boolean(editingId);
    const url = isEditing ? `/api/admin/movies/${editingId}` : '/api/admin/movies';

    try {
      await axios({
        method: isEditing ? 'PUT' : 'POST',
        url,
        data: form,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setForm(emptyForm);
      setEditingId(null);
      invalidateApiCache('/api/movies');
      invalidateApiCache('/api/admin/movies');
      fetchMovies();
    } catch (error) {
      alert('Failed to save movie.');
      console.error(error);
    }
  };

  const handleEdit = (movie) => {
    setForm({
      title: movie.title ?? '',
      genre: movie.genre ?? '',
      year: movie.year ?? '',
      description: movie.description ?? '',
      videoUrl: movie.videoUrl ?? '',
      trailerUrl: movie.trailerUrl ?? '',
      requiredSubscription: movie.requiredSubscription ?? 'BASIC',
    });
    setEditingId(movie.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this movie?')) return;
    try {
      await axios.delete(`/api/admin/movies/${id}`);
      invalidateApiCache('/api/movies');
      invalidateApiCache('/api/admin/movies');
      fetchMovies();
    } catch (error) {
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <p className="muted-text">Loading admin dashboard...</p>
      </div>
    );
  }

  const premiumCount = movies.filter((movie) => movie.requiredSubscription === 'PREMIUM').length;
  const standardCount = movies.filter((movie) => movie.requiredSubscription === 'STANDARD').length;
  const basicCount = movies.filter((movie) => movie.requiredSubscription === 'BASIC').length;

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">Fast CRUD with direct visibility into catalog distribution.</p>
        </div>
      </div>

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span className="admin-stat-label">Total Movies</span>
          <strong className="admin-stat-value">{movies.length}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Premium</span>
          <strong className="admin-stat-value">{premiumCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Standard</span>
          <strong className="admin-stat-value">{standardCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Basic</span>
          <strong className="admin-stat-value">{basicCount}</strong>
        </article>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">{editingId ? 'Edit Movie' : 'Add Movie'}</h2>
        </div>

        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleInputChange}
            className="field-control"
            placeholder="Title"
            required
          />
          <input
            type="text"
            name="genre"
            value={form.genre}
            onChange={handleInputChange}
            className="field-control"
            placeholder="Genre"
            required
          />
          <input
            type="number"
            name="year"
            value={form.year}
            onChange={handleInputChange}
            className="field-control"
            placeholder="Year"
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleInputChange}
            className="field-control admin-form-wide admin-description-input"
            placeholder="Description"
            rows={4}
            required
          />
          <select
            name="requiredSubscription"
            value={form.requiredSubscription}
            onChange={handleInputChange}
            className="field-control"
          >
            <option value="BASIC">BASIC</option>
            <option value="STANDARD">STANDARD</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>
          <input
            type="url"
            name="videoUrl"
            value={form.videoUrl}
            onChange={handleInputChange}
            className="field-control admin-form-wide"
            placeholder="Video URL"
            required
          />
          <input
            type="url"
            name="trailerUrl"
            value={form.trailerUrl}
            onChange={handleInputChange}
            className="field-control admin-form-wide"
            placeholder="Trailer URL"
            required
          />
          <div className="admin-form-actions admin-form-wide">
            <button type="submit" className="btn btn-primary">
              {editingId ? 'Update Movie' : 'Save Movie'}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">Movie Catalog</h2>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Genre</th>
                <th>Year</th>
                <th>Description</th>
                <th>Plan</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((movie) => (
                <tr key={movie.id}>
                  <td>{movie.title}</td>
                  <td>{movie.genre}</td>
                  <td>{movie.year}</td>
                  <td>
                    <p className="admin-description-preview">{movie.description || '-'}</p>
                  </td>
                  <td>
                    <span className="movie-card-genre">{movie.requiredSubscription}</span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => handleEdit(movie)}>
                        Edit
                      </button>
                      <button className="btn btn-primary" onClick={() => handleDelete(movie.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default Admin;
