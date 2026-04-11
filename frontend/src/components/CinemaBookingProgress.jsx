import { useTranslation } from 'react-i18next';

const FLOW_STEPS = [
  'movie',
  'cinema',
  'date',
  'showtime',
  'seats',
  'checkout',
  'payment',
  'ticket',
];

function CinemaBookingProgress({ currentStep = 'movie', className = '' }) {
  const { t } = useTranslation();
  const currentIndex = Math.max(0, FLOW_STEPS.indexOf(currentStep));

  return (
    <section className={`cinema-booking-progress ${className}`.trim()} aria-label={t('cinema.bookingProgressAria')}>
      <div className="cinema-booking-progress-head">
        <p className="cinema-section-eyebrow">{t('cinema.bookingJourney')}</p>
        <strong>{t('cinema.bookingJourneyTitle')}</strong>
      </div>

      <ol className="cinema-booking-progress-list">
        {FLOW_STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isComplete = index < currentIndex;
          return (
            <li
              key={step}
              className={[
                'cinema-booking-progress-step',
                isCurrent ? 'is-current' : '',
                isComplete ? 'is-complete' : '',
              ].filter(Boolean).join(' ')}
            >
              <span>{index + 1}</span>
              <div>
                <strong>{t(`cinema.flowStep.${step}`)}</strong>
                <small>{t(`cinema.flowStepHint.${step}`)}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default CinemaBookingProgress;
