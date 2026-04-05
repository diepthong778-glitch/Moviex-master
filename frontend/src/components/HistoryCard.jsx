import { useTranslation } from 'react-i18next';
import { resolvePosterUrl, IMAGE_FALLBACK } from '../utils/media';

function HistoryCard({ item, onContinue, onRestart, onRemove }) {
  const { t } = useTranslation();
  const title = item?.title || item?.movieTitle || t('sharedUi.unknown');
  const poster = resolvePosterUrl(item);
  const progressSeconds = Number.isFinite(item?.lastWatchTime)
    ? item.lastWatchTime
    : Number.isFinite(item?.progress)
      ? item.progress
      : Number.isFinite(item?.watchTime)
        ? item.watchTime
        : 0;
  const durationSeconds = Number.isFinite(item?.duration) ? item.duration : 0;
  const progressPercent =
    durationSeconds > 0 ? Math.min(100, Math.floor((progressSeconds / durationSeconds) * 100)) : 0;
  const lastWatchedLabel = item?.watchedAt
    ? new Date(item.watchedAt).toLocaleString()
    : null;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-ink/40 p-4 shadow-card md:flex-row md:items-center">
      <div className="relative aspect-[2/3] w-full max-w-[120px] overflow-hidden rounded-xl">
        <img
          src={poster}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.src = IMAGE_FALLBACK;
          }}
        />
      </div>
      <div className="flex-1 space-y-2">
        <div>
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          {lastWatchedLabel && (
            <p className="text-xs text-slate">{t('historyCard.lastWatched', { value: lastWatchedLabel })}</p>
          )}
        </div>
        {progressPercent > 0 && (
          <div className="space-y-1">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full bg-ember" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[11px] text-slate">{t('historyCard.watchedPercent', { percent: progressPercent })}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full bg-ember px-4 py-2 text-xs font-semibold text-white transition hover:translate-y-[-1px]"
            onClick={onContinue}
          >
            {t('historyCard.continueWatching')}
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
            onClick={onRestart}
          >
            {t('historyCard.watchAgain')}
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-emberSoft transition hover:bg-white/10"
            onClick={onRemove}
          >
            {t('historyCard.remove')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default HistoryCard;
