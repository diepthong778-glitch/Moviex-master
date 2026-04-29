import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import CinemaBookingProgress from '../components/CinemaBookingProgress';
import CinemaBookingSummary from '../components/CinemaBookingSummary';
import CinemaModuleNav from '../components/CinemaModuleNav';
import PageTransition from '../components/motion/PageTransition';
import Reveal from '../components/motion/Reveal';
import StaggerGroup from '../components/motion/StaggerGroup';
import { useCinemaBooking } from '../context/CinemaBookingContext';
import { fetchCinemaShowtimeDetail, quoteCinemaBooking } from '../utils/cinemaApi';

const normalizeSeatType = (type) => {
  const key = String(type || 'NORMAL').toUpperCase();
  if (key === 'STANDARD') return 'normal';
  if (key === 'VIP') return 'vip';
  if (key === 'COUPLE') return 'couple';
  return 'normal';
};

const normalizeSeatStatus = (status) => {
  const key = String(status || 'AVAILABLE').toUpperCase();
  if (key === 'OUT_OF_SERVICE') return 'out-of-service';
  return key.toLowerCase();
};

const buildSeatRows = (seats) => {
  const rows = new Map();
  seats.forEach((seat) => {
    const row = seat.row || '?';
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push({
      id: seat.seatId || seat.id,
      label: `${row}${seat.number}`,
      row,
      number: seat.number,
      type: normalizeSeatType(seat.type),
      status: normalizeSeatStatus(seat.status),
    });
  });

  return Array.from(rows.entries())
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([row, rowSeats]) => ({
      row,
      seats: rowSeats.sort((a, b) => (a.number || 0) - (b.number || 0)),
    }));
};

function CinemaSeatSelection() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    showtime: bookingShowtime,
    seatIds: storedSeatIds,
    setSelectedShowtime,
    setSeatSelection,
  } = useCinemaBooking();
  const showtimeId = location.state?.showtimeId || bookingShowtime?.id;

  const [showtime, setShowtime] = useState(null);
  const [seatMap, setSeatMap] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [bookingQuote, setBookingQuote] = useState(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const storedSeatKey = useMemo(
    () => (Array.isArray(storedSeatIds) ? storedSeatIds.join('|') : ''),
    [storedSeatIds]
  );

  useEffect(() => {
    if (showtimeId && bookingShowtime?.id === showtimeId && storedSeatIds.length > 0) {
      setSelectedSeats(storedSeatIds);
      return;
    }
    setSelectedSeats([]);
  }, [bookingShowtime?.id, showtimeId, storedSeatKey]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      if (!showtimeId) {
        setError(t('cinema.missingShowtimePleaseSelectFirst'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const [showtimeData, seatData] = await Promise.all([
          fetchCinemaShowtimeDetail(showtimeId),
          axios.get(`/api/cinema/showtimes/${showtimeId}/seats`),
        ]);

        if (!active) return;

        setShowtime(showtimeData);
        setSelectedShowtime(showtimeData);
        setSeatMap(buildSeatRows(Array.isArray(seatData.data) ? seatData.data : []));
      } catch (fetchError) {
        if (active) {
          setError(fetchError?.response?.data?.message || t('cinema.loadSeatAvailabilityFailed'));
          setSeatMap([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    return () => {
      active = false;
    };
  }, [showtimeId]);

  const seatIndex = useMemo(() => {
    const index = new Map();
    seatMap.forEach((row) => {
      row.seats.forEach((seat) => {
        index.set(seat.id, seat);
      });
    });
    return index;
  }, [seatMap]);

  const selectedSeatLabels = useMemo(
    () => selectedSeats.map((id) => seatIndex.get(id)?.label || id),
    [selectedSeats, seatIndex]
  );
  const selectedSeatLabelsKey = useMemo(() => selectedSeatLabels.join('|'), [selectedSeatLabels]);

  const selectedSeatKey = useMemo(() => selectedSeats.join('|'), [selectedSeats]);

  useEffect(() => {
    let active = true;

    const loadQuote = async () => {
      if (!showtimeId || selectedSeats.length === 0) {
        setBookingQuote(null);
        setQuoteError('');
        setIsQuoting(false);
        return;
      }

      setIsQuoting(true);
      setQuoteError('');

      try {
        const quote = await quoteCinemaBooking({ showtimeId, seatIds: selectedSeats });
        if (active) {
          setBookingQuote(quote);
        }
      } catch (quoteFetchError) {
        if (active) {
          setBookingQuote(null);
          setQuoteError(quoteFetchError?.response?.data?.message || t('cinema.unableToCalculateBookingPrice'));
        }
      } finally {
        if (active) {
          setIsQuoting(false);
        }
      }
    };

    const timer = setTimeout(loadQuote, 180);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [showtimeId, selectedSeatKey]);

  const totalPrice = useMemo(() => Number(bookingQuote?.total || 0), [bookingQuote?.total]);
  const checkoutDisabled = !selectedSeats.length || isQuoting || Boolean(quoteError) || !bookingQuote;

  useEffect(() => {
    setSeatSelection({
      seatIds: selectedSeats,
      seatLabels: selectedSeatLabels,
      pricingBreakdown: bookingQuote,
    });
  }, [bookingQuote, selectedSeatKey, selectedSeatLabelsKey, setSeatSelection]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'available') return;
    setSelectedSeats((current) =>
      current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id]
    );
  };

  const handleCheckout = () => {
    if (!showtime) return;
    setSelectedShowtime(showtime);
    setSeatSelection({
      seatIds: selectedSeats,
      seatLabels: selectedSeatLabels,
      pricingBreakdown: bookingQuote,
    });
    navigate('/cinema/checkout');
  };

  const renderShell = (content) => (
    <PageTransition as="div" className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        {content}
      </div>
    </PageTransition>
  );

  if (isLoading) {
    return renderShell(<p className="cinema-empty">{t('common.loading')}</p>);
  }

  if (!showtime || error) {
    return renderShell(
      <>
        <p className="cinema-empty">{error || t('cinema.noShowtimes')}</p>
        <Link to="/cinema/now-showing" className="btn btn-outline">
          {t('cinema.navNowShowing')}
        </Link>
      </>
    );
  }

  return (
    <PageTransition as="div" className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <Reveal delay={10}>
          <CinemaBookingProgress currentStep="seats" />
        </Reveal>

        <Reveal className="cinema-page-header" delay={30} y={12}>
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.selectSeats')}</p>
            <h1 className="cinema-title">{showtime.movie.title}</h1>
            <p className="cinema-subtitle">
              {showtime.cinemaName} - {showtime.auditoriumName} - {showtime.startTime}
            </p>
          </div>
          <Link to={`/cinema/movie/${showtime.movieId}/showtimes`} className="btn btn-outline">
            {t('cinema.selectShowtime')}
          </Link>
        </Reveal>

        <div className="cinema-seat-booking-layout">
          <Reveal as="section" className="cinema-seat-layout cinema-seat-map-panel" delay={50} aria-label={t('cinema.selectSeats')}>
            <div className="cinema-seat-map-head">
              <div>
                <p className="cinema-section-eyebrow">{t('cinema.flowStep.seats')}</p>
                <h2>{t('cinema.selectSeats')}</h2>
              </div>
              <span className="cinema-pill">{selectedSeatLabels.length} {t('cinema.seats')}</span>
            </div>

            <div className="cinema-screen">{t('cinema.screen')}</div>
            <StaggerGroup className="cinema-seat-grid" threshold={0.02}>
              {seatMap.map((row, rowIndex) => (
                <div
                  key={row.row}
                  className="cinema-seat-row mx-stagger-item"
                  style={{ '--motion-item-delay': `${Math.min(rowIndex, 9) * 34}ms` }}
                >
                  <span>{row.row}</span>
                  <div
                    className="cinema-seat-row-items"
                    style={{ gridTemplateColumns: `repeat(${row.seats.length}, minmax(0, 1fr))` }}
                  >
                    {row.seats.map((seat) => {
                      const isSelected = selectedSeats.includes(seat.id);
                      const seatClass = `cinema-seat${seat.status !== 'available' ? ` is-${seat.status}` : ''}${
                        seat.type ? ` is-${seat.type}` : ''
                      }${isSelected ? ' is-selected' : ''}`;
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          className={`${seatClass} mx-pressable`}
                          onClick={() => toggleSeat(seat)}
                          disabled={seat.status !== 'available'}
                          title={`${seat.label} ${String(seat.type || 'normal').toUpperCase()}`}
                          aria-pressed={isSelected}
                        >
                          {seat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </StaggerGroup>
            <div className="cinema-seat-legend cinema-seat-legend-clear">
              <span><i className="legend-dot available" /> {t('cinema.legendAvailable')}</span>
              <span><i className="legend-dot selected" /> {t('cinema.legendSelected')}</span>
              <span><i className="legend-dot reserved" /> {t('cinema.legendReserved')}</span>
              <span><i className="legend-dot booked" /> {t('cinema.legendBooked')}</span>
              <span><i className="legend-dot out" /> {t('cinema.legendOutOfService')}</span>
              <span className="legend-chip vip">{t('cinema.legendVip')}</span>
              <span className="legend-chip couple">{t('cinema.legendCouple')}</span>
            </div>
          </Reveal>

          <Reveal delay={70} y={10}>
            <CinemaBookingSummary
              movieTitle={showtime.movie.title}
              cinemaName={showtime.cinemaName}
              auditoriumName={showtime.auditoriumName}
              showDate={showtime.showDate}
              time={showtime.startTime}
              selectedSeats={selectedSeatLabels}
              pricingBreakdown={bookingQuote}
              total={totalPrice}
              isLoadingPrices={isQuoting}
              priceError={quoteError}
              actionLabel={t('cinema.ctaCheckout')}
              actionDisabled={checkoutDisabled}
              onAction={handleCheckout}
            >
              {selectedSeats.length > 0 && !quoteError && (
                <p className="cinema-price-note">
                  {t('cinema.priceIsCalculatedByBackendAndWillBeVerifiedAgainAtCheckout')}
                </p>
              )}
            </CinemaBookingSummary>
          </Reveal>
        </div>
      </div>
    </PageTransition>
  );
}

export default CinemaSeatSelection;
