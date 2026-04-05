import { resolvePosterUrl, IMAGE_FALLBACK } from '../utils/media';

function WatchlistSection({ items = [], loading, onSelect, title, countLabel, emptyLabel }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-carbon/70 p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold text-white">{title}</h3>
          <p className="text-xs uppercase tracking-[0.3em] text-slate">Saved for later</p>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate">
          {countLabel}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading watchlist…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate">{emptyLabel}</p>
      ) : (
        <div className="max-h-[420px] overflow-y-auto pr-1 scrollbar-slim">
          <div className="grid gap-4 sm:grid-cols-2">
            {items.map((movie) => {
              const poster = resolvePosterUrl(movie);
              const titleText = movie?.title || movie?.movieTitle || 'Untitled';
              const meta = [movie?.genre, movie?.year].filter(Boolean).join(' • ');
              return (
                <button
                  key={movie?.id || titleText}
                  type="button"
                  onClick={() => onSelect(movie)}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink/40 text-left transition hover:-translate-y-1 hover:border-white/25 hover:shadow-[0_16px_32px_rgba(0,0,0,0.35)]"
                >
                  <div className="relative aspect-[2/3] overflow-hidden">
                    <img
                      src={poster}
                      alt={titleText}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = IMAGE_FALLBACK;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
                    <div className="absolute inset-0 flex items-end justify-between p-3 opacity-0 transition duration-300 group-hover:opacity-100">
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white">Watch Now</span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 backdrop-blur">
                        <svg viewBox="0 0 24 24" className="h-4 w-4 text-white">
                          <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                        </svg>
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 px-4 py-3">
                    <h4 className="text-sm font-semibold text-white">{titleText}</h4>
                    <p className="text-xs text-slate">{meta || 'Ready to stream'}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default WatchlistSection;
