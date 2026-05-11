import { lazy, memo, startTransition, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import MovieCard from '../components/MovieCard';
import PageTransition from '../components/motion/PageTransition';
import Reveal from '../components/motion/Reveal';
import StaggerGroup from '../components/motion/StaggerGroup';
import { useAuth } from '../context/AuthContext';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtube';
import { cachedGet, extractErrorMessage } from '../utils/api';

const MovieDetailModal = lazy(() => import('../components/MovieDetailModal'));
const MoviePlayer = lazy(() => import('../components/MoviePlayer'));

const WATCH_PROGRESS_KEY = 'moviex.watch.progress';
const MAX_MOVIES_PER_RAIL = 8;
const HERO_VIDEO_TIMEOUT_MS = 4500;
const HERO_POSTER_FALLBACK = '/posters/p4.svg';
const HOME_REVEAL_FAILSAFE_MS = 450;

function PlayerSuspenseFallback() {
  return (
    <div className="player-modal-overlay">
      <div className="player-layout">
        <main className="player-main">
          <div className="player-video-container">
            <div className="player-poster-backdrop">
              <img src={HERO_POSTER_FALLBACK} alt="" className="player-poster-img" />
              <div className="player-poster-overlay" />
            </div>
            <div className="player-loader-container">
              <div className="player-loading-skeleton">
                <span className="player-loading-bar" />
                <span className="player-loading-bar" />
                <span className="player-loading-bar" />
              </div>
              <div className="player-loader loading-spinner" />
            </div>
          </div>
        </main>
        <aside className="player-side-panel" />
      </div>
    </div>
  );
}

const getMovieIdentifier = (movie) => {
  const rawId = movie?.id ?? movie?._id ?? movie?.movieId;
  if (rawId == null) return '';
  return String(rawId).trim();
};

const normalizeMovieRecord = (movie) => {
  if (!movie || typeof movie !== 'object') return null;

  const id = getMovieIdentifier(movie);
  if (!id) return null;

  return {
    ...movie,
    id,
  };
};

const normalizeMovieArray = (items) => {
  if (!Array.isArray(items)) return [];
  return items.map(normalizeMovieRecord).filter(Boolean);
};

const normalizeMovieCollection = (payload) => {
  if (Array.isArray(payload)) return normalizeMovieArray(payload);
  if (Array.isArray(payload?.content)) return normalizeMovieArray(payload.content);
  if (Array.isArray(payload?.movies)) return normalizeMovieArray(payload.movies);
  if (Array.isArray(payload?.items)) return normalizeMovieArray(payload.items);
  if (Array.isArray(payload?.data)) return normalizeMovieArray(payload.data);
  return [];
};

const readProgressMap = () => {
  const raw = localStorage.getItem(WATCH_PROGRESS_KEY);
  if (!raw || raw === 'undefined' || raw === 'null') return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

const writeProgressMap = (map) => {
  localStorage.setItem(WATCH_PROGRESS_KEY, JSON.stringify(map));
};

function MovieRailComponent({ title, subtitle, movies, onSelect, watchProgress, delay = 0 }) {
  const railMovies = movies.slice(0, MAX_MOVIES_PER_RAIL);
  if (!railMovies.length) return null;

  return (
    <Reveal as="section" className="section rail-section" delay={delay} fallbackMs={HOME_REVEAL_FAILSAFE_MS}>
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      <StaggerGroup className="movie-rail" fallbackMs={HOME_REVEAL_FAILSAFE_MS}>
        {railMovies.map((movie, index) => (
          <div
            className="rail-item mx-stagger-item"
            style={{ '--motion-item-delay': `${Math.min(index, 7) * 48}ms` }}
            key={movie.id}
          >
            <MovieCard movie={movie} onPlay={onSelect} progress={watchProgress[movie.id]} />
          </div>
        ))}
      </StaggerGroup>
    </Reveal>
  );
}

const MovieRail = memo(MovieRailComponent, (prevProps, nextProps) => {
  return (
    prevProps.title === nextProps.title &&
    prevProps.subtitle === nextProps.subtitle &&
    prevProps.movies === nextProps.movies &&
    prevProps.onSelect === nextProps.onSelect &&
    prevProps.watchProgress === nextProps.watchProgress &&
    prevProps.delay === nextProps.delay
  );
});

function Home() {
  const { t } = useTranslation();
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [detailMovie, setDetailMovie] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [watchProgress, setWatchProgress] = useState({});
  const [visibleCount, setVisibleCount] = useState(24);
  const [subscription, setSubscription] = useState(null);
  const { user } = useAuth();
  const [entitlements, setEntitlements] = useState({ unlockedMovieIds: [] });
  const [requestedStartAtSeconds, setRequestedStartAtSeconds] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const translatePlanLabel = (plan) => {
    return t(`common.plansLabel.${plan || 'NONE'}`);
  };

  const fetchMovies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const searchData = await cachedGet('/api/movies/search', {
        ttlMs: 60000,
        cacheKey: 'movies:home:search:default',
        config: {
          params: {
            page: 0,
            size: 120,
            sortBy: 'title',
            sortDir: 'asc',
          },
        },
      });
      let moviesPayload = normalizeMovieCollection(searchData);

      if (!moviesPayload.length) {
        const allMoviesData = await cachedGet('/api/movies', {
          ttlMs: 60000,
          cacheKey: 'movies:home:all',
        });
        moviesPayload = normalizeMovieCollection(allMoviesData);
      }

      setMovies(moviesPayload);
    } catch (err) {
      console.error('[Home] Failed to load movie catalog.', {
        message: extractErrorMessage(err, t('homePage.failedToLoadMovies')),
        error: err,
      });
      setError(extractErrorMessage(err, t('homePage.failedToLoadMovies')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchMovies();
    const loadProgress = async () => {
      const local = readProgressMap();
      if (user) {
        try {
          const response = await axios.get('/api/history/me');
          const history = response.data || [];
          const remoteMap = {};
          history.forEach((item) => {
            remoteMap[item.movieId] = {
              currentTime: item.progress,
              duration: item.duration,
              updatedAt: new Date(item.watchedAt).getTime(),
            };
          });

          const merged = { ...local };
          Object.keys(remoteMap).forEach((id) => {
            if (!merged[id] || remoteMap[id].updatedAt > merged[id].updatedAt) {
              merged[id] = remoteMap[id];
            }
          });

          setWatchProgress(merged);
          writeProgressMap(merged);
          return;
        } catch (err) {
          console.warn('[Home] Failed to fetch remote watch history.', err);
        }
      }
      setWatchProgress(local);
    };
    loadProgress();
  }, [fetchMovies, user]);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        setEntitlements({ unlockedMovieIds: [] });
        return;
      }
      try {
        const [subscriptionResult, entitlementsResult] = await Promise.allSettled([
          cachedGet('/api/subscription/me', { ttlMs: 10000 }),
          cachedGet('/api/payment/entitlements/me', { ttlMs: 5000 }),
        ]);

        setSubscription(subscriptionResult.status === 'fulfilled' ? subscriptionResult.value : null);
        setEntitlements(
          entitlementsResult.status === 'fulfilled'
            ? entitlementsResult.value
            : {
                subscriptionPlan: user?.subscriptionPlan || 'BASIC',
                unlockedMovieIds: user?.unlockedMovieIds || [],
              }
        );
      } catch (err) {
        console.warn('[Home] Failed to load subscription or entitlement data.', {
          message: extractErrorMessage(err, 'Failed to load subscription data.'),
          error: err,
        });
        setSubscription(null);
        setEntitlements({
          subscriptionPlan: user?.subscriptionPlan || 'BASIC',
          unlockedMovieIds: user?.unlockedMovieIds || [],
        });
      }
    };

    fetchSubscription();
  }, [user]);

  const normalizeRequiredSubscription = useCallback((requiredSub) => {
    const normalized = String(requiredSub || 'BASIC').toUpperCase();
    if (normalized === 'PREMIUM' || normalized === 'STANDARD') return normalized;
    return 'BASIC';
  }, []);

  const canPlanAccess = useCallback((planType, requiredSub) => {
    const normalizedRequired = normalizeRequiredSubscription(requiredSub);
    if (normalizedRequired === 'BASIC') return true;
    if (planType === 'PREMIUM') return true;
    return planType === 'STANDARD' && normalizedRequired === 'STANDARD';
  }, [normalizeRequiredSubscription]);

  const hasMovieUnlock = useCallback((movieId) => {
    return Array.isArray(entitlements?.unlockedMovieIds) && entitlements.unlockedMovieIds.includes(movieId);
  }, [entitlements?.unlockedMovieIds]);

  const saveWatchStart = useCallback(async (movie, startAtSeconds = 0) => {
    const movieId = getMovieIdentifier(movie);
    if (!movieId) return;
    try {
      const resolvedStart = Number.isFinite(startAtSeconds) ? Math.max(0, Math.floor(startAtSeconds)) : 0;
      await axios.post('/api/history/save', {
        movieId,
        movieTitle: movie.title,
        progress: resolvedStart,
      });
    } catch (err) {
      console.warn('[Home] Failed to save watch start.', {
        movieId,
        message: extractErrorMessage(err, 'Failed to save watch progress.'),
        error: err,
      });
    }
  }, []);

  const openMoviePlayer = useCallback((movie, startAtSeconds = null) => {
    const normalizedMovie = normalizeMovieRecord(movie);
    if (!normalizedMovie?.id) {
      console.error('[Home] Cannot open movie without a valid identifier.', { movie });
      return { status: 'invalid' };
    }

    const canonicalMovie = movies.find((item) => item.id === normalizedMovie.id) || normalizedMovie;
    const resolvedStart = Number.isFinite(startAtSeconds) ? Math.max(0, Math.floor(startAtSeconds)) : null;

    if (!user) {
      navigate('/plans');
      return { status: 'redirected', destination: '/plans' };
    }

    const effectivePlan =
      subscription?.status === 'ACTIVE'
        ? subscription.planType
        : entitlements?.subscriptionPlan || 'BASIC';
    const movieUnlocked = hasMovieUnlock(canonicalMovie.id);
    const isTrailerMode = Boolean(normalizedMovie.isTrailerOnly || !canonicalMovie.hasFullMovie);

    if (!isTrailerMode && !movieUnlocked && !canPlanAccess(effectivePlan, canonicalMovie.requiredSubscription)) {
      navigate(`/payment?movieId=${encodeURIComponent(canonicalMovie.id)}`);
      return { status: 'redirected', destination: 'payment' };
    }

    setRequestedStartAtSeconds(isTrailerMode ? null : resolvedStart);
    if (!isTrailerMode) {
      saveWatchStart(canonicalMovie, resolvedStart ?? 0);
    }
    setSelectedMovie({ ...canonicalMovie, isTrailerOnly: isTrailerMode });
    return { status: 'opened', movieId: canonicalMovie.id };
  }, [movies, navigate, user, subscription, entitlements, canPlanAccess, hasMovieUnlock, saveWatchStart]);

  const navigateToMovie = useCallback((movie, startAtSeconds = null) => {
    const movieId = getMovieIdentifier(movie);
    if (!movieId) {
      console.error('[Home] Cannot navigate to a movie without a valid identifier.', { movie });
      return;
    }

    const params = new URLSearchParams({ play: movieId });
    if (Number.isFinite(startAtSeconds)) {
      params.set('t', String(Math.max(0, Math.floor(startAtSeconds))));
    }

    navigate(`/browse?${params.toString()}`);
  }, [navigate]);

  const playMovie = useCallback((movie) => {
    navigateToMovie(movie, null);
  }, [navigateToMovie]);

  useEffect(() => {
    const movieId = searchParams.get('play');
    if (!movieId) return;
    if (!user) return;

    let cancelled = false;
    const requestedTimeRaw = searchParams.get('t');
    const requestedTime = requestedTimeRaw != null ? Number.parseInt(requestedTimeRaw, 10) : 0;
    const startAt = Number.isFinite(requestedTime) ? requestedTime : 0;

    const openFromUrl = async () => {
      const id = String(movieId).trim();
      if (!id) {
        console.error('[Home] Ignoring playback request without a valid movie id.', { movieId });
        navigate('/browse', { replace: true });
        return;
      }

      try {
        const inList = movies.find((item) => item.id === id);
        const fetchedMovie = inList || await cachedGet(`/api/movies/${encodeURIComponent(id)}`, {
          ttlMs: 60000,
          cacheKey: `movie:play:${id}`,
        });
        const resolvedMovie = normalizeMovieRecord(fetchedMovie);

        if (cancelled) return;

        if (!resolvedMovie?.id) {
          console.error('[Home] Movie playback request resolved without a valid movie record.', {
            movieId: id,
            response: fetchedMovie,
          });
          navigate('/browse', { replace: true });
          return;
        }

        const result = openMoviePlayer(resolvedMovie, startAt);
        if (result?.status !== 'redirected') {
          navigate('/browse', { replace: true });
        }
      } catch (err) {
        if (cancelled) return;

        console.error('[Home] Failed to load movie for playback.', {
          movieId: id,
          startAt,
          message: extractErrorMessage(err, 'Failed to load movie for playback.'),
          error: err,
        });
        navigate('/browse', { replace: true });
      }
    };

    void openFromUrl();

    return () => {
      cancelled = true;
    };
  }, [searchParams, movies, user, openMoviePlayer, navigate]);
  const handleSelectMovie = useCallback((movie) => {
    if (!movie?.id) return;
    const canonicalMovie = movies.find((item) => item.id === movie.id) || movie;
    setDetailMovie(canonicalMovie);
  }, [movies]);

  const handlePurchaseMovie = useCallback((movie) => {
    if (!movie?.id) return;
    navigate(`/payment?movieId=${encodeURIComponent(movie.id)}`);
  }, [navigate]);

  const handleProgressChange = useCallback((movieId, progress) => {
    setWatchProgress((current) => {
      const previous = current[movieId];
      if (
        previous &&
        previous.currentTime === progress.currentTime &&
        previous.duration === progress.duration &&
        previous.updatedAt === progress.updatedAt
      ) {
        return current;
      }

      const nextMap = { ...current, [movieId]: progress };
      writeProgressMap(nextMap);
      return nextMap;
    });
  }, []);

  const handleSearchChange = useCallback((event) => {
    const value = event.target.value;
    startTransition(() => {
      setSearchQuery(value);
    });
  }, []);

  const filteredMovies = useMemo(
    () => {
      const value = deferredSearchQuery.trim().toLowerCase();
      if (!value) return movies;

      return movies.filter((movie) => {
        return (
          movie.title?.toLowerCase().includes(value) ||
          movie.genre?.toLowerCase().includes(value) ||
          String(movie.year ?? '').includes(value)
        );
      });
    },
    [movies, deferredSearchQuery]
  );

  const activeQueue = useMemo(
    () => (filteredMovies.length ? filteredMovies : movies),
    [filteredMovies, movies]
  );
  const featuredMovie = activeQueue[0];
  const featuredTrailerUrl = useMemo(() => {
    if (!featuredMovie?.trailerUrl) return '';
    const featuredTrailerId = extractYouTubeVideoId(featuredMovie.trailerUrl);
    return getYouTubeEmbedUrl(featuredMovie.trailerUrl, {
      autoplay: 1,
      mute: 1,
      loop: 1,
      controls: 0,
      playlist: featuredTrailerId,
      rel: 0,
      playsinline: 1,
    });
  }, [featuredMovie?.trailerUrl]);
  const featuredHeroPoster = useMemo(
    () => (
      featuredMovie?.backdropUrl
      || featuredMovie?.posterUrl
      || featuredMovie?.image
      || HERO_POSTER_FALLBACK
    ),
    [featuredMovie?.backdropUrl, featuredMovie?.posterUrl, featuredMovie?.image]
  );
  const [heroPosterSrc, setHeroPosterSrc] = useState(HERO_POSTER_FALLBACK);
  const [heroVideoStatus, setHeroVideoStatus] = useState('unavailable');
  const canRenderHeroVideo = Boolean(
    featuredTrailerUrl && (heroVideoStatus === 'loading' || heroVideoStatus === 'ready')
  );
  const isHeroVideoReady = heroVideoStatus === 'ready';
  const isHeroVideoLoading = heroVideoStatus === 'loading';

  useEffect(() => {
    setHeroPosterSrc(featuredHeroPoster || HERO_POSTER_FALLBACK);
  }, [featuredHeroPoster]);

  useEffect(() => {
    if (!featuredTrailerUrl) {
      setHeroVideoStatus('unavailable');
      return;
    }
    setHeroVideoStatus('loading');
  }, [featuredTrailerUrl, featuredMovie?.id]);

  useEffect(() => {
    if (heroVideoStatus !== 'loading') return undefined;

    const timeoutId = window.setTimeout(() => {
      setHeroVideoStatus((current) => (current === 'loading' ? 'failed' : current));
    }, HERO_VIDEO_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [heroVideoStatus, featuredTrailerUrl]);

  const handleHeroVideoLoaded = useCallback(() => {
    setHeroVideoStatus((current) => (current === 'loading' ? 'ready' : current));
  }, []);

  const handleHeroVideoFailed = useCallback(() => {
    setHeroVideoStatus('failed');
  }, []);

  useEffect(() => {
    setVisibleCount(24);
  }, [deferredSearchQuery, movies.length]);

  useEffect(() => {
    if (loading || error) return undefined;

    const handleScroll = () => {
      if (window.innerHeight + window.scrollY < document.body.offsetHeight - 360) return;
      setVisibleCount((prev) => {
        if (prev >= activeQueue.length) return prev;
        return Math.min(prev + 12, activeQueue.length);
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeQueue.length, loading, error]);

  const continueWatching = useMemo(
    () =>
      movies
        .filter((movie) => {
          const progress = watchProgress[movie.id];
          if (!progress || !progress.duration || !progress.currentTime) return false;
          return progress.currentTime > 15 && progress.currentTime < progress.duration - 15;
        })
        .sort((a, b) => {
          const aAt = watchProgress[a.id]?.updatedAt ?? 0;
          const bAt = watchProgress[b.id]?.updatedAt ?? 0;
          return bAt - aAt;
        }),
    [movies, watchProgress]
  );
  const continueWatchingIds = useMemo(() => new Set(continueWatching.map((movie) => movie.id)), [continueWatching]);
  const watchedGenres = useMemo(
    () => new Set(continueWatching.map((movie) => movie.genre).filter(Boolean)),
    [continueWatching]
  );
  const recommended = useMemo(
    () =>
      activeQueue.filter(
        (movie) =>
          !continueWatchingIds.has(movie.id) &&
          (watchedGenres.size === 0 || watchedGenres.has(movie.genre))
      ),
    [activeQueue, continueWatchingIds, watchedGenres]
  );
  const premiumPicks = useMemo(
    () => activeQueue.filter((movie) => normalizeRequiredSubscription(movie.requiredSubscription) === 'PREMIUM'),
    [activeQueue, normalizeRequiredSubscription]
  );
  const standardPicks = useMemo(
    () => activeQueue.filter((movie) => normalizeRequiredSubscription(movie.requiredSubscription) === 'STANDARD'),
    [activeQueue, normalizeRequiredSubscription]
  );
  const freePicks = useMemo(
    () => activeQueue.filter((movie) => normalizeRequiredSubscription(movie.requiredSubscription) === 'BASIC'),
    [activeQueue, normalizeRequiredSubscription]
  );
  const exploreMore = useMemo(
    () => activeQueue.slice(0, visibleCount),
    [activeQueue, visibleCount]
  );
  const hasMore = visibleCount < activeQueue.length;

  return (
    <>
      <PageTransition as="div" style={{ paddingTop: '72px' }} className="home-shell">
        <section className="hero" id="hero">
          <div className={`hero-media hero-poster-media${isHeroVideoLoading ? ' is-video-loading' : ''}`} aria-hidden="true">
            <img
              className="hero-poster-frame"
              src={heroPosterSrc || HERO_POSTER_FALLBACK}
              alt=""
              loading="eager"
              fetchpriority="high"
              decoding="async"
              onError={() => setHeroPosterSrc(HERO_POSTER_FALLBACK)}
            />
          </div>
          {canRenderHeroVideo && (
            <div className={`hero-media hero-video-media${isHeroVideoReady ? ' is-ready' : ''}`} aria-hidden="true">
              <iframe
                className="hero-video-frame"
                src={featuredTrailerUrl}
                title={featuredMovie?.title || 'Moviex featured trailer'}
                allow="autoplay; encrypted-media; picture-in-picture"
                tabIndex={-1}
                loading="lazy"
                onLoad={handleHeroVideoLoaded}
                onError={handleHeroVideoFailed}
              />
            </div>
          )}
          <div className="hero-overlay" aria-hidden="true" />
          <Reveal className="hero-content" y={12}>
            <div className="hero-badge">{t('homePage.nowStreaming')}</div>
            {featuredMovie ? (
              <>
                <h1>
                  {featuredMovie.title}, <span className="gradient-text">{t('homePage.featuredAccent')}</span>
                </h1>
                <div className="hero-meta">
                  <span className="hero-meta-pill">{featuredMovie.genre}</span>
                  <span className="hero-meta-pill">{featuredMovie.year}</span>
                  <span className="hero-meta-pill">{translatePlanLabel(normalizeRequiredSubscription(featuredMovie.requiredSubscription))}</span>
                </div>
                <p>
                  {featuredMovie.description ||
                    t('homePage.featuredAccess', {
                      genre: featuredMovie.genre,
                      year: featuredMovie.year,
                      plan: translatePlanLabel(normalizeRequiredSubscription(featuredMovie.requiredSubscription)),
                    })}
                </p>
              </>
            ) : (
              <>
                <h1>
                  {t('homePage.defaultTitleStart')} <span className="gradient-text">{t('homePage.defaultAccent')}</span>
                </h1>
                <p>{t('homePage.defaultDescription')}</p>
              </>
            )}
            <div className="hero-actions">
              {featuredMovie && (
                <button className="btn btn-primary" onClick={() => playMovie(featuredMovie)}>
                  {t('homePage.playFeatured')}
                </button>
              )}
              <a href="#discover" className="btn btn-outline">
                {t('homePage.browseMovies')}
              </a>
            </div>
          </Reveal>
        </section>

        <Reveal
          as="section"
          className="section discover-toolbar"
          id="discover"
          y={14}
          fallbackMs={HOME_REVEAL_FAILSAFE_MS}
        >
          <div className="section-header">
            <div>
              <h2 className="section-title">{t('homePage.discover')}</h2>
              <p className="section-subtitle">{t('homePage.discoverSubtitle')}</p>
            </div>
            <div className="search-container search-container-inline">
              <input
                type="text"
                placeholder={t('homePage.searchPlaceholder')}
                value={searchQuery}
                onChange={handleSearchChange}
                className="search-input"
                aria-label={t('homePage.searchAria')}
              />
            </div>
          </div>

          {loading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <span className="loading-text">{t('homePage.loadingMovies')}</span>
            </div>
          )}

          {error && (
            <div className="error-container">
              <div className="error-icon">!</div>
              <h3 className="error-title">{t('homePage.failedToLoadMovies')}</h3>
              <p className="error-message">{error}</p>
              <button className="btn btn-primary" onClick={fetchMovies}>
                {t('common.tryAgain')}
              </button>
            </div>
          )}

          {!loading && !error && movies.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">MOVIE</div>
              <h3 className="empty-title">{t('homePage.noMoviesFound')}</h3>
            </div>
          )}

          {!loading && !error && movies.length > 0 && filteredMovies.length > 0 && (
            <>
              <MovieRail
                title={t('homePage.continueWatching')}
                subtitle={t('homePage.continueWatchingSubtitle')}
                movies={continueWatching}
                onSelect={playMovie}
                watchProgress={watchProgress}
                delay={20}
              />

              <MovieRail
                title={t('homePage.recommended')}
                subtitle={t('homePage.recommendedSubtitle')}
                movies={recommended}
                onSelect={playMovie}
                watchProgress={watchProgress}
                delay={40}
              />

              <MovieRail
                title={t('homePage.premiumPicks')}
                subtitle={t('homePage.premiumPicksSubtitle')}
                movies={premiumPicks}
                onSelect={playMovie}
                watchProgress={watchProgress}
                delay={60}
              />

              <MovieRail
                title={t('homePage.standardCollection')}
                subtitle={t('homePage.standardCollectionSubtitle')}
                movies={standardPicks}
                onSelect={playMovie}
                watchProgress={watchProgress}
                delay={80}
              />

              <MovieRail
                title={t('homePage.freeToStart')}
                subtitle={t('homePage.freeToStartSubtitle')}
                movies={freePicks}
                onSelect={playMovie}
                watchProgress={watchProgress}
                delay={100}
              />

              <Reveal as="section" className="section" delay={120} fallbackMs={HOME_REVEAL_FAILSAFE_MS}>
                <div className="section-header">
                  <div>
                    <h2 className="section-title">{t('homePage.exploreMore')}</h2>
                    <p className="section-subtitle">{t('homePage.exploreMoreSubtitle')}</p>
                  </div>
                </div>

                <StaggerGroup className="movies-grid three-per-row" threshold={0.04} fallbackMs={HOME_REVEAL_FAILSAFE_MS}>
                  {exploreMore.map((movie, index) => (
                    <div
                      className="grid-item mx-stagger-item"
                      style={{ '--motion-item-delay': `${(index % 12) * 36}ms` }}
                      key={movie.id}
                    >
                      <MovieCard movie={movie} onPlay={playMovie} progress={watchProgress[movie.id]} />
                    </div>
                  ))}
                </StaggerGroup>
              </Reveal>

              {hasMore && <p className="infinite-hint">{t('homePage.scrollHint')}</p>}
            </>
          )}

          {!loading && !error && movies.length > 0 && filteredMovies.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">SEARCH</div>
              <h3 className="empty-title">{t('homePage.noMatchingMovies')}</h3>
              <p className="empty-text">{t('homePage.tryDifferentSearch')}</p>
            </div>
          )}
        </Reveal>
      </PageTransition>

      <Suspense fallback={<PlayerSuspenseFallback />}>
        {detailMovie && (
          <MovieDetailModal
            movie={detailMovie}
            onClose={() => setDetailMovie(null)}
            onPurchaseMovie={(movie) => {
              setDetailMovie(null);
              handlePurchaseMovie(movie);
            }}
            onPlay={(m) => {
              setDetailMovie(null);
              playMovie(m);
            }}
          />
        )}

        {selectedMovie && (
          <MoviePlayer
            movie={selectedMovie}
            moviesQueue={activeQueue}
            startAtSeconds={requestedStartAtSeconds}
            onClose={() => {
              setSelectedMovie(null);
              setRequestedStartAtSeconds(null);
            }}
            onPlayMovie={(next) => {
              setRequestedStartAtSeconds(null);
              setSelectedMovie(next);
            }}
            onProgress={handleProgressChange}
          />
        )}
      </Suspense>
    </>
  );
}

export default Home;
