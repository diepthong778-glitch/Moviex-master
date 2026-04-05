import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authHeaders, cachedGet } from '../utils/api';
import { resolvePosterUrl } from '../utils/media';
import WatchlistSection from '../components/WatchlistSection';
import HistorySection from '../components/HistorySection';

const applyTheme = (isDarkMode) => {
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  localStorage.setItem('moviex.theme', isDarkMode ? 'dark' : 'light');
};

const enrichHistoryItems = async (historyItems, watchlistItems, headers) => {
  if (!Array.isArray(historyItems)) return [];

  const watchlistMap = new Map();
  (watchlistItems || []).forEach((movie) => {
    const id = movie?.id || movie?.movieId;
    if (id) watchlistMap.set(id, movie);
  });

  const missingIds = [];
  historyItems.forEach((item) => {
    const movieId = item?.movieId;
    if (movieId && !watchlistMap.has(movieId)) {
      missingIds.push(movieId);
    }
  });

  const fetchedMap = new Map();
  const uniqueMissing = Array.from(new Set(missingIds));
  if (uniqueMissing.length) {
    const results = await Promise.all(
      uniqueMissing.map((id) =>
        cachedGet(`/api/movies/${encodeURIComponent(id)}`, {
          ttlMs: 60000,
          cacheKey: `movie:${id}`,
          config: { headers },
        }).catch(() => null)
      )
    );

    results.forEach((movie) => {
      if (movie?.id) fetchedMap.set(movie.id, movie);
    });
  }

  return historyItems.map((item) => {
    const movieId = item?.movieId;
    const movieData = (movieId && (watchlistMap.get(movieId) || fetchedMap.get(movieId))) || {};

    const merged = {
      ...movieData,
      ...item,
      movieId,
      title: item?.movieTitle || movieData?.title,
      movieTitle: item?.movieTitle || movieData?.title,
      trailerUrl: movieData?.trailerUrl || item?.trailerUrl,
      videoUrl: movieData?.videoUrl || item?.videoUrl,
      duration: item?.duration || movieData?.duration,
    };

    merged.posterUrl = resolvePosterUrl(merged);
    return merged;
  });
};

function ProfilePage() {
  const { user, getToken } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('moviex.theme') !== 'light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);

        const headers = authHeaders(getToken());
        const [subscriptionData, watchlistData, historyData] = await Promise.all([
          cachedGet('/api/subscription', { ttlMs: 10000, config: { headers } }),
          cachedGet('/api/watchlist', { ttlMs: 10000, config: { headers } }),
          cachedGet('/api/history/me', { ttlMs: 10000, config: { headers, params: { limit: 50 } } }),
        ]);

        setSubscription(subscriptionData || null);
        setWatchlist(Array.isArray(watchlistData) ? watchlistData : []);
        const hydratedHistory = await enrichHistoryItems(
          Array.isArray(historyData) ? historyData : [],
          Array.isArray(watchlistData) ? watchlistData : [],
          headers
        );
        setHistory(hydratedHistory);
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [getToken]);

  useEffect(() => {
    applyTheme(darkMode);
  }, [darkMode]);

  const translatePlanLabel = (plan) => t(`common.plansLabel.${plan || 'NONE'}`);
  const translateStatusLabel = (status) => t(`common.statusLabel.${status || 'INACTIVE'}`);
  const username = user?.username || user?.email?.split('@')?.[0] || t('common.user');
  const selectedLanguage = localStorage.getItem('moviex.language') || 'en';
  const selectedLanguageLabel = {
    en: 'English',
    vi: 'Vietnamese',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
  }[selectedLanguage] || 'English';

  const handleWatchlistSelect = (movie) => {
    const movieId = movie?.id || movie?.movieId;
    if (!movieId) return;
    navigate(`/browse?play=${encodeURIComponent(movieId)}`);
  };

  const handleHistoryContinue = (item) => {
    const movieId = item?.movieId;
    if (!movieId) return;
    const progress =
      Number.isFinite(item?.lastWatchTime)
        ? item.lastWatchTime
        : Number.isFinite(item?.progress)
          ? item.progress
          : Number.isFinite(item?.watchTime)
            ? item.watchTime
            : 0;
    navigate(`/browse?play=${encodeURIComponent(movieId)}&t=${Math.max(0, Math.floor(progress))}`);
  };

  const handleHistoryRestart = (item) => {
    const movieId = item?.movieId;
    if (!movieId) return;
    navigate(`/browse?play=${encodeURIComponent(movieId)}&t=0`);
  };

  const handleHistoryRemove = async (item) => {
    const movieId = item?.movieId || item?.id;
    if (!movieId) {
      return;
    }
    try {
      const headers = authHeaders(getToken());
      const url = `/api/history/me/${encodeURIComponent(movieId)}`;
      const response = await axios.delete(url, { headers });
      setHistory((current) =>
        current.filter((entry) => (entry.movieId || entry.id) !== movieId)
      );
    } catch (error) {
    }
  };

  return (
    <div className="min-h-screen bg-ink pb-16 pt-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emberSoft">
            {t('profilePage.badge')}
          </p>
          <h1 className="text-3xl font-display font-extrabold text-white md:text-5xl">
            {t('profilePage.title')}
          </h1>
          <p className="max-w-2xl text-sm text-slate md:text-base">
            {t('profilePage.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border border-white/10 bg-carbon/70 p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-white">{t('profilePage.userInfo')}</h3>
                <p className="text-xs uppercase tracking-[0.3em] text-slate">{t('profilePage.accountSection')}</p>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate">
                {t('common.account')}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('common.username')}</span>
                <p className="text-sm font-semibold text-white">{username}</p>
              </div>
              <div>
                <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('common.email')}</span>
                <p className="text-sm font-semibold text-white">{user?.email || '-'}</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-carbon/70 p-6 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-white">{t('profilePage.subscription')}</h3>
                <p className="text-xs uppercase tracking-[0.3em] text-slate">{t('profilePage.membershipSection')}</p>
              </div>
              <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate">
                {translateStatusLabel(subscription?.status)}
              </span>
            </div>
            {loading ? (
              <p className="text-sm text-slate">{t('profilePage.loadingSubscription')}</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.plan')}</span>
                  <p className="text-sm font-semibold text-white">{translatePlanLabel(subscription?.type)}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.status')}</span>
                  <p className="text-sm font-semibold text-white">{translateStatusLabel(subscription?.status)}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.startDate')}</span>
                  <p className="text-sm font-semibold text-white">{subscription?.startDate || '-'}</p>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.endDate')}</span>
                  <p className="text-sm font-semibold text-white">{subscription?.endDate || '-'}</p>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <WatchlistSection
            items={watchlist}
            loading={loading}
            onSelect={handleWatchlistSelect}
            title={t('common.watchlist')}
            countLabel={t('common.saved', { count: watchlist.length })}
            emptyLabel={t('profilePage.noSavedMovies')}
          />

          <HistorySection
            items={history}
            loading={loading}
            onContinue={handleHistoryContinue}
            onRestart={handleHistoryRestart}
            onRemove={handleHistoryRemove}
            title={t('common.history')}
            countLabel={t('common.items', { count: history.length })}
            emptyLabel={t('profilePage.noWatchHistory')}
          />
        </div>

        <section className="mt-8 rounded-3xl border border-white/10 bg-carbon/70 p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-display font-bold text-white">{t('profilePage.settings')}</h3>
              <p className="text-xs uppercase tracking-[0.3em] text-slate">{t('profilePage.uiOnly')}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-sm text-white">
              <span>{t('common.darkMode')}</span>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.currentMode')}</span>
              <p className="text-sm font-semibold text-white">{darkMode ? t('common.dark') : t('common.light')}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.selectedLanguage')}</span>
              <p className="text-sm font-semibold text-white">
                {selectedLanguageLabel}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;
