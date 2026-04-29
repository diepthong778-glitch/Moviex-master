import axios from 'axios';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authHeaders } from '../utils/api';
import { getYouTubeEmbedUrl } from '../utils/youtube';

const TRAILER_EMBED_TIMEOUT_MS = 4200;
const TRAILER_FALLBACK_IMAGE = '/posters/p4.svg';

function MovieDetailModal({ movie, onClose, onPlay, onPurchaseMovie }) {
  const { getToken, user } = useAuth();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [trailerStatus, setTrailerStatus] = useState('unavailable');
  const trailerEmbedUrl = movie.trailerUrl
    ? getYouTubeEmbedUrl(movie.trailerUrl, {
        autoplay: 0,
        mute: 0,
        controls: 1,
        rel: 0,
        playsinline: 1,
      })
    : '';
  const trailerFallbackImage = movie.backdropUrl || movie.posterUrl || movie.image || TRAILER_FALLBACK_IMAGE;

  useEffect(() => {
    if (!trailerEmbedUrl) {
      setTrailerStatus('unavailable');
      return;
    }

    setTrailerStatus('loading');
  }, [trailerEmbedUrl, movie.id]);

  useEffect(() => {
    if (trailerStatus !== 'loading') return undefined;

    const timeoutId = window.setTimeout(() => {
      setTrailerStatus((current) => (current === 'loading' ? 'failed' : current));
    }, TRAILER_EMBED_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [trailerStatus, trailerEmbedUrl]);

  const translatePlanLabel = (plan) => t(`common.plansLabel.${plan || 'NONE'}`);
  const requiredPlan = String(movie.requiredSubscription || 'BASIC').toUpperCase();

  const quickEpisodes = Array.from({ length: 6 }, (_, index) => ({
    id: `${movie.id}-e${index + 1}`,
    title: t('movie.episodeTitle', { number: index + 1 }),
    duration: t('common.minutesShort', { count: 45 + index }),
  }));

  const addToWatchlist = async () => {
    if (!user) {
      setMessage(t('movie.loginRequiredToSaveWatchlist'));
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      await axios.post(
        '/api/watchlist/add',
        { movieId: movie.id },
        { headers: authHeaders(getToken()) }
      );
      setMessage(t('movie.addedToWatchlist'));
    } catch {
      setMessage(t('movie.couldNotAddToWatchlist'));
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="detail-modal-overlay" onClick={handleOverlayClick}>
      <article className="detail-modal">
        <header className="detail-header">
          <div>
            <h2 className="detail-title">{movie.title}</h2>
            <p className="detail-meta">
              {movie.genre} | {movie.year} | {translatePlanLabel(requiredPlan)}
            </p>
          </div>
          <button className="player-close-btn" onClick={onClose} aria-label={t('movie.closeDetails')}>
            x
          </button>
        </header>

        <div className="detail-actions">
          <button className="btn btn-primary" onClick={() => onPlay(movie)}>
            {t('movie.playNow')}
          </button>
          {requiredPlan !== 'BASIC' && typeof onPurchaseMovie === 'function' && (
            <button className="btn btn-primary" onClick={() => onPurchaseMovie(movie)}>
              {t('plansPage.payWithSandboxQr')}
            </button>
          )}
          <button className="btn btn-outline" onClick={addToWatchlist} disabled={saving}>
            {saving ? t('movie.saving') : t('movie.addToWatchlist')}
          </button>
        </div>

        <div className="detail-trailer detail-trailer-shell">
          <img
            className="detail-trailer-fallback"
            src={trailerFallbackImage}
            alt=""
            loading="lazy"
          />
          {(trailerStatus === 'loading' || trailerStatus === 'ready') && trailerEmbedUrl && (
            <iframe
              className={`detail-trailer-frame${trailerStatus === 'ready' ? ' is-ready' : ''}`}
              src={trailerEmbedUrl}
              title={`${movie.title} trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              loading="lazy"
              onLoad={() => setTrailerStatus((current) => (current === 'loading' ? 'ready' : current))}
              onError={() => setTrailerStatus('failed')}
            />
          )}
        </div>

        <p className="detail-description">
          {movie.description || t('movie.noSynopsis')}
        </p>

        <section>
          <h3 className="player-side-title">{t('movie.episodeList')}</h3>
          <div className="detail-episode-list">
            {quickEpisodes.map((episode) => (
              <button key={episode.id} className="player-next-item" onClick={() => onPlay(movie)}>
                <span className="player-next-name">{episode.title}</span>
                <span className="player-next-meta">{episode.duration}</span>
              </button>
            ))}
          </div>
        </section>

        {message && <p className="muted-text">{message}</p>}
      </article>
    </div>
  );
}

export default MovieDetailModal;
