import { useTranslation } from 'react-i18next';

const FLOW_STEPS = [
  { id: 'movie', label: 'Movie' },
  { id: 'showtime', label: 'Showtime' },
  { id: 'seats', label: 'Seats' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
  { id: 'ticket', label: 'Ticket' },
];

function CinemaBookingProgress({ currentStep = 'movie', className = '' }) {
  const { t } = useTranslation();
  const normalizedCurrentStep = currentStep === 'checkout' ? 'review' : currentStep;
  const currentIndex = Math.max(
    0,
    FLOW_STEPS.findIndex((step) => step.id === normalizedCurrentStep)
  );

  return (
    <section className={`cinema-booking-progress ${className}`.trim()} aria-label={t('cinema.bookingProgressAria')}>
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
              <span className="cinema-booking-progress-index">{index + 1}</span>
              <span className="cinema-booking-progress-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default CinemaBookingProgress;
