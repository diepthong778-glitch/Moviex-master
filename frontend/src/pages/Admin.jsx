import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const translatePlanLabel = (plan) => t(`common.plansLabel.${plan || 'NONE'}`);

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
      alert(t('adminMoviePage.saveFailed'));
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
    if (!window.confirm(t('adminMoviePage.deleteConfirm'))) return;
    try {
      await axios.delete(`/api/admin/movies/${id}`);
      invalidateApiCache('/api/movies');
      invalidateApiCache('/api/admin/movies');
      fetchMovies();
    } catch (error) {
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <p className="muted-text">{t('adminMoviePage.loading')}</p>
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
          <h1 className="page-title">{t('adminMoviePage.title')}</h1>
          <p className="page-subtitle">{t('adminMoviePage.subtitle')}</p>
        </div>
      </div>

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span className="admin-stat-label">{t('adminMoviePage.totalMovies')}</span>
          <strong className="admin-stat-value">{movies.length}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">{translatePlanLabel('PREMIUM')}</span>
          <strong className="admin-stat-value">{premiumCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">{translatePlanLabel('STANDARD')}</span>
          <strong className="admin-stat-value">{standardCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">{translatePlanLabel('BASIC')}</span>
          <strong className="admin-stat-value">{basicCount}</strong>
        </article>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">{editingId ? t('adminMoviePage.editMovie') : t('adminMoviePage.addMovie')}</h2>
        </div>

        <form className="admin-form-grid" onSubmit={handleSubmit}>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleInputChange}
            className="field-control"
            placeholder={t('adminMoviePage.fields.title')}
            required
          />
          <input
            type="text"
            name="genre"
            value={form.genre}
            onChange={handleInputChange}
            className="field-control"
            placeholder={t('adminMoviePage.fields.genre')}
            required
          />
          <input
            type="number"
            name="year"
            value={form.year}
            onChange={handleInputChange}
            className="field-control"
            placeholder={t('adminMoviePage.fields.year')}
            required
          />
          <textarea
            name="description"
            value={form.description}
            onChange={handleInputChange}
            className="field-control admin-form-wide admin-description-input"
            placeholder={t('adminMoviePage.fields.description')}
            rows={4}
            required
          />
          <select
            name="requiredSubscription"
            value={form.requiredSubscription}
            onChange={handleInputChange}
            className="field-control"
          >
            <option value="BASIC">{translatePlanLabel('BASIC')}</option>
            <option value="STANDARD">{translatePlanLabel('STANDARD')}</option>
            <option value="PREMIUM">{translatePlanLabel('PREMIUM')}</option>
          </select>
          <input
            type="url"
            name="videoUrl"
            value={form.videoUrl}
            onChange={handleInputChange}
            className="field-control admin-form-wide"
            placeholder={t('adminMoviePage.fields.videoUrl')}
            required
          />
          <input
            type="url"
            name="trailerUrl"
            value={form.trailerUrl}
            onChange={handleInputChange}
            className="field-control admin-form-wide"
            placeholder={t('adminMoviePage.fields.trailerUrl')}
            required
          />
          <div className="admin-form-actions admin-form-wide">
            <button type="submit" className="btn btn-primary">
              {editingId ? t('adminMoviePage.updateMovie') : t('adminMoviePage.saveMovie')}
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
                {t('common.close')}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('adminMoviePage.movieCatalog')}</h2>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('adminMoviePage.columns.title')}</th>
                <th>{t('adminMoviePage.columns.genre')}</th>
                <th>{t('adminMoviePage.columns.year')}</th>
                <th>{t('adminMoviePage.columns.description')}</th>
                <th>{t('adminMoviePage.columns.plan')}</th>
                <th>{t('adminMoviePage.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {movies.map((movie) => (
                <tr key={movie.id}>
                  <td>{movie.title}</td>
                  <td>{movie.genre}</td>
                  <td>{movie.year}</td>
                  <td>
                    <p className="admin-description-preview">{movie.description || t('sharedUi.unknown')}</p>
                  </td>
                  <td>
                    <span className="movie-card-genre">{translatePlanLabel(movie.requiredSubscription)}</span>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-outline" onClick={() => handleEdit(movie)}>
                        {t('adminMoviePage.actions.edit')}
                      </button>
                      <button className="btn btn-primary" onClick={() => handleDelete(movie.id)}>
                        {t('adminMoviePage.actions.delete')}
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
