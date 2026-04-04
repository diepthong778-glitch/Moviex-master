import HistoryCard from './HistoryCard';

function HistorySection({ items = [], loading, onContinue, onRestart, onRemove, title, countLabel, emptyLabel }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-carbon/70 p-6 shadow-card">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-display font-bold text-white">{title}</h3>
          <p className="text-xs uppercase tracking-[0.3em] text-slate">Recently watched</p>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate">
          {countLabel}
        </span>
      </div>

      {loading ? (
        <p className="text-sm text-slate">Loading history…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate">{emptyLabel}</p>
      ) : (
        <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1 scrollbar-slim">
          {items.map((item) => (
            <HistoryCard
              key={`${item.movieId}-${item.watchedAt || item.updatedAt || item.lastWatchTime || item.progress || 0}`}
              item={item}
              onContinue={() => onContinue(item)}
              onRestart={() => onRestart(item)}
              onRemove={() => onRemove(item)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default HistorySection;
