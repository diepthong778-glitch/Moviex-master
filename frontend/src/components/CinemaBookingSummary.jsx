import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../utils/cinema';

function CinemaBookingSummary({
  movieTitle = '-',
  cinemaName = '-',
  auditoriumName = '-',
  showDate = '-',
  time = '-',
  selectedSeats = [],
  pricingBreakdown = null,
  total = 0,
  subtotal = null,
  isLoadingPrices = false,
  priceError = '',
  statusRows = [],
  actionLabel = '',
  actionDisabled = false,
  onAction,
  children,
}) {
  const { t } = useTranslation();
  const seatLines = Array.isArray(pricingBreakdown?.seats) ? pricingBreakdown.seats : [];
  const seatLabels = selectedSeats.length > 0 ? selectedSeats : [];
  const resolvedSubtotal = Number(subtotal ?? pricingBreakdown?.subtotal ?? total ?? 0);
  const resolvedTotal = Number(pricingBreakdown?.total ?? total ?? 0);

  return (
    <aside className="cinema-booking-side-summary" aria-label={t('cinema.bookingSummary')}>
      <div>
        <p className="cinema-section-eyebrow">{t('cinema.bookingSummary')}</p>
        <h3>{movieTitle || '-'}</h3>
      </div>

      <div className="cinema-booking-summary-table">
        <div>
          <span>{t('cinema.cinemaLabel')}</span>
          <strong>{cinemaName || '-'}</strong>
        </div>
        <div>
          <span>{t('cinema.auditoriumLabel')}</span>
          <strong>{auditoriumName || '-'}</strong>
        </div>
        <div>
          <span>{t('cinema.dateLabel')}</span>
          <strong>{showDate || '-'}</strong>
        </div>
        <div>
          <span>{t('cinema.timeLabel')}</span>
          <strong>{time || '-'}</strong>
        </div>
        {statusRows.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{row.value || '-'}</strong>
          </div>
        ))}
      </div>

      <div className="cinema-booking-summary-seats">
        <div className="cinema-breakdown-header">
          <div>
            <p className="cinema-breakdown-label">{t('cinema.seats')}</p>
            <h4>{t('cinema.seatBySeatPricing')}</h4>
          </div>
          <span className="cinema-price-chip">{t('cinema.verifiedByServer')}</span>
        </div>

        {priceError ? (
          <p className="cinema-note cinema-note-error">{priceError}</p>
        ) : seatLines.length > 0 ? (
          <div className="cinema-summary-seat-list">
            {seatLines.map((line) => (
              <div key={line.seatId || line.seatLabel} className="cinema-summary-seat-line">
                <div>
                  <strong>{line.seatLabel || line.seatId}</strong>
                  <span>{(line.seatType || 'NORMAL').toString()} · {line.pricingRule || t('cinema.basePrice')}</span>
                </div>
                <strong>{formatCurrency(Number(line.lineTotal || line.unitPrice || 0))}</strong>
              </div>
            ))}
          </div>
        ) : seatLabels.length > 0 ? (
          <div className="cinema-summary-seat-list">
            {seatLabels.map((seat) => (
              <div key={seat} className="cinema-summary-seat-line">
                <div>
                  <strong>{seat}</strong>
                  <span>{isLoadingPrices ? t('cinema.calculating') : t('cinema.preparingPricingDetailsFromBackend')}</span>
                </div>
                <strong>{isLoadingPrices ? t('cinema.calculating') : '-'}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="cinema-price-note">{t('cinema.selectSeats')}</p>
        )}
      </div>

      <div className="cinema-summary-totals">
        <div>
          <span>{t('cinema.subtotal')}</span>
          <strong>{isLoadingPrices ? t('cinema.calculating') : formatCurrency(resolvedSubtotal)}</strong>
        </div>
        <div className="cinema-summary-grand-total">
          <span>{t('cinema.total')}</span>
          <strong>{isLoadingPrices ? t('cinema.calculating') : formatCurrency(resolvedTotal)}</strong>
        </div>
      </div>

      {actionLabel && (
        <button
          type="button"
          className="btn btn-primary cinema-summary-primary-action"
          disabled={actionDisabled}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      )}

      {children}
    </aside>
  );
}

export default CinemaBookingSummary;
