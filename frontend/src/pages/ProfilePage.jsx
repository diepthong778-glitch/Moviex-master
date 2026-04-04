import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authHeaders, cachedGet } from '../utils/api';
import WatchlistSection from '../components/WatchlistSection';
import HistorySection from '../components/HistorySection';

const applyTheme = (isDarkMode) => {
  document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  localStorage.setItem('moviex.theme', isDarkMode ? 'dark' : 'light');
};

function ProfilePage() {
  const { user, getToken } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [watchlist, setWatchlist] = useState([]);
  const [history, setHistory] = useState([]);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('moviex.theme') !== 'light');
  const [language, setLanguage] = useState(() => localStorage.getItem('moviex.language') || i18n.resolvedLanguage || 'en');
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
        setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (error) {
        console.error('Profile data fetch failed:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [getToken]);

  useEffect(() => {
    if (!loading) {
      console.debug('[Profile] Watchlist sample:', watchlist[0]);
      console.debug('[Profile] History sample:', history[0]);
    }
  }, [loading, watchlist, history]);

  useEffect(() => {
    applyTheme(darkMode);
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('moviex.language', language);
    if (i18n.resolvedLanguage !== language) {
      i18n.changeLanguage(language);
    }
  }, [language, i18n]);

  const translatePlanLabel = (plan) => t(`common.plansLabel.${plan || 'NONE'}`);
  const translateStatusLabel = (status) => t(`common.statusLabel.${status || 'INACTIVE'}`);
  const username = user?.username || user?.email?.split('@')?.[0] || t('common.user');

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
    const movieId = item?.movieId;
    if (!movieId) return;
    try {
      await axios.delete(`/api/history/me/${encodeURIComponent(movieId)}`, {
        headers: authHeaders(getToken()),
      });
      setHistory((current) => current.filter((entry) => entry.movieId !== movieId));
    } catch (error) {
      console.error('Failed to remove history item', error);
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
                <p className="text-xs uppercase tracking-[0.3em] text-slate">Account</p>
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
                <p className="text-xs uppercase tracking-[0.3em] text-slate">Membership</p>
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

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-sm text-white">
              <span>{t('common.darkMode')}</span>
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
            </label>

            <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-ink/40 px-4 py-3 text-sm text-white">
              <span>{t('common.language')}</span>
              <select
                className="rounded-lg bg-transparent text-sm text-white"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="en">{t('common.english')}</option>
                <option value="vi">{t('common.vietnamese')}</option>
                <option value="ja">{t('common.japanese')}</option>
              </select>
            </label>

            <div className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.currentMode')}</span>
              <p className="text-sm font-semibold text-white">{darkMode ? t('common.dark') : t('common.light')}</p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-ink/40 px-4 py-3">
              <span className="text-xs uppercase tracking-[0.2em] text-slate">{t('profilePage.selectedLanguage')}</span>
              <p className="text-sm font-semibold text-white">
                {language === 'vi' ? t('common.vietnamese') : language === 'ja' ? t('common.japanese') : t('common.english')}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default ProfilePage;
