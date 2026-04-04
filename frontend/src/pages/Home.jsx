import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import MovieCard from '../components/MovieCard';
import MovieDetailModal from '../components/MovieDetailModal';
import MoviePlayer from '../components/MoviePlayer';
import { useAuth } from '../context/AuthContext';
import { extractYouTubeVideoId, getYouTubeEmbedUrl } from '../utils/youtube';
import { cachedGet } from '../utils/api';

const WATCH_PROGRESS_KEY = 'moviex.watch.progress';
const MAX_MOVIES_PER_RAIL = 8;

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

function MovieRail({ title, subtitle, movies, onSelect, watchProgress }) {
  const railMovies = movies.slice(0, MAX_MOVIES_PER_RAIL);
  if (!railMovies.length) return null;

  return (
    <section className="section rail-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      <div className="movie-rail">
        {railMovies.map((movie) => (
          <div className="rail-item" key={movie.id}>
            <MovieCard movie={movie} onPlay={onSelect} progress={watchProgress[movie.id]} />
          </div>
        ))}
      </div>
    </section>
  );
}

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
  const [requestedStartAtSeconds, setRequestedStartAtSeconds] = useState(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const translatePlanLabel = (plan) => {
    return t(`common.plansLabel.${plan || 'NONE'}`);
  };

  useEffect(() => {
    fetchMovies();
    setWatchProgress(readProgressMap());
  }, []);

  const fetchMovies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cachedGet('/api/movies/search', {
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
      const moviesPayload = Array.isArray(data?.content) ? data.content : [];
      if (Array.isArray(moviesPayload)) {
        const seen = new Set();
        const duplicates = new Set();
        moviesPayload.forEach((movie) => {
          const id = movie?.id;
          if (!id) return;
          if (seen.has(id)) duplicates.add(id);
          seen.add(id);
        });
        if (duplicates.size > 0) {
          console.error('[Home] Duplicate movie ids detected:', Array.from(duplicates));
        }
      }
      setMovies(moviesPayload);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) {
        setSubscription(null);
        return;
      }
      try {
        const data = await cachedGet('/api/subscription/me', { ttlMs: 10000 });
        setSubscription(data);
      } catch {
        setSubscription(null);
      }
    };

    fetchSubscription();
  }, [user]);

  const canPlanAccess = (planType, requiredSub) => {
    if (requiredSub === 'BASIC') return true;
    if (planType === 'PREMIUM') return true;
    return planType === 'STANDARD' && requiredSub === 'STANDARD';
  };

  const saveWatchStart = async (movie, startAtSeconds = 0) => {
    if (!movie?.id) return;
    try {
      const resolvedStart = Number.isFinite(startAtSeconds) ? Math.max(0, Math.floor(startAtSeconds)) : 0;
      await axios.post('/api/history/save', {
        movieId: movie.id,
        movieTitle: movie.title,
        progress: resolvedStart,
      });
    } catch {
      // ignore save errors here
    }
  };

  const openMoviePlayer = (movie, startAtSeconds = null) => {
    if (!movie || !movie.id) return;
    const canonicalMovie = movies.find((item) => item.id === movie.id) || movie;
    const resolvedStart = Number.isFinite(startAtSeconds) ? Math.max(0, Math.floor(startAtSeconds)) : null;

    if (!user) {
      navigate('/plans');
      return;
    }

    if (!subscription?.planType || subscription?.status === 'PENDING') {
      navigate('/plans');
      return;
    }

    if (subscription?.status === 'EXPIRED') {
      alert(t('homePage.subscriptionExpired'));
      return;
    }

    if (!canPlanAccess(subscription.planType, canonicalMovie.requiredSubscription)) {
      alert(t('homePage.upgradeRequired'));
      navigate('/plans');
      return;
    }

    setRequestedStartAtSeconds(resolvedStart);
    saveWatchStart(canonicalMovie, resolvedStart ?? 0);
    setSelectedMovie(canonicalMovie);
  };

  const playMovie = (movie) => {
    openMoviePlayer(movie, null);
  };

  useEffect(() => {
    const movieId = searchParams.get('play');
    if (!movieId) return;
    if (!user || !subscription) return;

    let cancelled = false;
    const requestedTimeRaw = searchParams.get('t');
    const requestedTime = requestedTimeRaw != null ? Number.parseInt(requestedTimeRaw, 10) : 0;
    const startAt = Number.isFinite(requestedTime) ? requestedTime : 0;

    const openFromUrl = async () => {
      const id = String(movieId).trim();
      if (!id) return;
      const inList = movies.find((item) => item.id === id);
      const resolvedMovie = inList || (await cachedGet(`/api/movies/${encodeURIComponent(id)}`, { ttlMs: 60000 }));
      if (cancelled || !resolvedMovie?.id) return;

      openMoviePlayer(resolvedMovie, startAt);
      navigate('/browse', { replace: true });
    };

    openFromUrl();

    return () => {
      cancelled = true;
    };
  }, [searchParams, movies, user, subscription, navigate]);
  const handleSelectMovie = (movie) => {
    if (!movie?.id) return;
    const canonicalMovie = movies.find((item) => item.id === movie.id) || movie;
    setDetailMovie(canonicalMovie);
  };

  const handleProgressChange = (movieId, progress) => {
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
  };

  const handleSearchChange = (event) => {
    const value = event.target.value;
    startTransition(() => {
      setSearchQuery(value);
    });
  };

  const filteredMovies = useMemo(
    () =>
      movies.filter((movie) => {
        const value = deferredSearchQuery.trim().toLowerCase();
        if (!value) return true;

        return (
          movie.title?.toLowerCase().includes(value) ||
          movie.genre?.toLowerCase().includes(value) ||
          String(movie.year ?? '').includes(value)
        );
      }),
    [movies, deferredSearchQuery]
  );

  const activeQueue = useMemo(
    () => (filteredMovies.length ? filteredMovies : movies),
    [filteredMovies, movies]
  );
  const featuredMovie = activeQueue[0];
  const featuredTrailerId = extractYouTubeVideoId(featuredMovie?.trailerUrl);
  const featuredTrailerUrl = featuredMovie?.trailerUrl
    ? getYouTubeEmbedUrl(featuredMovie.trailerUrl, {
        autoplay: 1,
        mute: 1,
        loop: 1,
        controls: 0,
        playlist: featuredTrailerId,
        rel: 0,
        playsinline: 1,
      })
    : '';

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
  const watchedGenres = useMemo(
    () => continueWatching.map((movie) => movie.genre).filter(Boolean),
    [continueWatching]
  );
  const recommended = useMemo(
    () =>
      activeQueue.filter(
        (movie) =>
          !continueWatching.some((watched) => watched.id === movie.id) &&
          (watchedGenres.length === 0 || watchedGenres.includes(movie.genre))
      ),
    [activeQueue, continueWatching, watchedGenres]
  );
  const premiumPicks = useMemo(
    () => activeQueue.filter((movie) => movie.requiredSubscription === 'PREMIUM'),
    [activeQueue]
  );
  const standardPicks = useMemo(
    () => activeQueue.filter((movie) => movie.requiredSubscription === 'STANDARD'),
    [activeQueue]
  );
  const freePicks = useMemo(
    () => activeQueue.filter((movie) => movie.requiredSubscription === 'BASIC'),
    [activeQueue]
  );
  const exploreMore = useMemo(
    () => activeQueue.slice(0, visibleCount),
    [activeQueue, visibleCount]
  );
  const hasMore = visibleCount < activeQueue.length;

  return (
    <div style={{ paddingTop: '72px' }} className="home-shell">
      <section className="hero" id="hero">
        {featuredTrailerUrl && (
          <div className="hero-media" aria-hidden="true">
            <iframe
              className="hero-video-frame"
              src={featuredTrailerUrl}
              title={featuredMovie?.title || 'Moviex featured trailer'}
              allow="autoplay; encrypted-media; picture-in-picture"
              tabIndex={-1}
            />
          </div>
        )}
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-content">
          <div className="hero-badge">{t('homePage.nowStreaming')}</div>
          {featuredMovie ? (
            <>
              <h1>
                {featuredMovie.title}, <span className="gradient-text">{t('homePage.featuredAccent')}</span>
              </h1>
              <div className="hero-meta">
                <span className="hero-meta-pill">{featuredMovie.genre}</span>
                <span className="hero-meta-pill">{featuredMovie.year}</span>
                <span className="hero-meta-pill">{translatePlanLabel(featuredMovie.requiredSubscription)}</span>
              </div>
              <p>
                {featuredMovie.description ||
                  t('homePage.featuredAccess', {
                    genre: featuredMovie.genre,
                    year: featuredMovie.year,
                    plan: translatePlanLabel(featuredMovie.requiredSubscription),
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
        </div>
      </section>

      <section className="section discover-toolbar" id="discover">
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
            />

            <MovieRail
              title={t('homePage.recommended')}
              subtitle={t('homePage.recommendedSubtitle')}
              movies={recommended}
              onSelect={handleSelectMovie}
              watchProgress={watchProgress}
            />

            <MovieRail
              title={t('homePage.premiumPicks')}
              subtitle={t('homePage.premiumPicksSubtitle')}
              movies={premiumPicks}
              onSelect={handleSelectMovie}
              watchProgress={watchProgress}
            />

            <MovieRail
              title={t('homePage.standardCollection')}
              subtitle={t('homePage.standardCollectionSubtitle')}
              movies={standardPicks}
              onSelect={handleSelectMovie}
              watchProgress={watchProgress}
            />

            <MovieRail
              title={t('homePage.freeToStart')}
              subtitle={t('homePage.freeToStartSubtitle')}
              movies={freePicks}
              onSelect={handleSelectMovie}
              watchProgress={watchProgress}
            />

            <section className="section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">{t('homePage.exploreMore')}</h2>
                  <p className="section-subtitle">{t('homePage.exploreMoreSubtitle')}</p>
                </div>
              </div>

              <div className="movies-grid three-per-row">
                {exploreMore.map((movie) => (
                  <div className="grid-item" key={movie.id}>
                    <MovieCard movie={movie} onPlay={handleSelectMovie} progress={watchProgress[movie.id]} />
                  </div>
                ))}
              </div>
            </section>

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
      </section>

      {detailMovie && (
          <MovieDetailModal
              movie={detailMovie}
              onClose={() => setDetailMovie(null)}
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
    </div>
  );
}

export default Home;
