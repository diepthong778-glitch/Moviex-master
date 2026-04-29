import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IMAGE_FALLBACK, resolvePosterUrl } from '../utils/media';

const fallbackPoster = IMAGE_FALLBACK;

function MovieRow({ title, subtitle, items = [], actionHref = '/browse' }) {
  const { t } = useTranslation();
  return (
    <section className="mx-auto max-w-6xl px-6">
      <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          {subtitle && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">{subtitle}</p>}
          <h2 className="text-2xl font-display font-bold md:text-3xl">{title}</h2>
        </div>
        <Link to={actionHref} className="text-sm text-slate hover:text-white">
          {t('movieRow.viewAll')}
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {items.map((item, index) => (
          <article
            key={item?.title || index}
            className="group min-w-[200px] max-w-[220px] flex-shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-carbon/60 transition hover:-translate-y-1 hover:border-white/25"
          >
            <div className="relative aspect-[2/3] overflow-hidden">
              <img
                src={resolvePosterUrl(item, fallbackPoster)}
                alt={item?.title || t('movieRow.posterAlt')}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                onError={(e) => {
                  e.currentTarget.src = fallbackPoster;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
              <div className="absolute inset-0 flex items-end justify-between p-3 opacity-0 transition duration-300 group-hover:opacity-100">
                <h3 className="text-xs font-semibold text-white">{item?.title || t('sharedUi.untitled')}</h3>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 backdrop-blur">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-white">
                    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" />
                  </svg>
                </span>
              </div>
            </div>
            <div className="space-y-1 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">{item?.title || t('sharedUi.untitled')}</h3>
              <p className="text-xs text-slate">{item?.tag || t('movieRow.nowStreaming')}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default MovieRow;
