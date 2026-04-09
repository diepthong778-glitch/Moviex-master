import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import CinemaModuleNav from '../components/CinemaModuleNav';
import { formatCurrency } from '../utils/cinema';
import { fetchCinemaShowtimeDetail } from '../utils/cinemaApi';

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
  const showtimeId = location.state?.showtimeId;

  const [showtime, setShowtime] = useState(null);
  const [seatMap, setSeatMap] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedSeats([]);
  }, [showtimeId]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      if (!showtimeId) {
        setError('Missing showtime. Please select a showtime first.');
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
        setSeatMap(buildSeatRows(Array.isArray(seatData.data) ? seatData.data : []));
      } catch (fetchError) {
        if (active) {
          setError(fetchError?.response?.data?.message || 'Unable to load seat availability.');
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

  const totalPrice = useMemo(
    () => (showtime?.price || 0) * selectedSeats.length,
    [showtime?.price, selectedSeats.length]
  );

  const toggleSeat = (seat) => {
    if (seat.status !== 'available') return;
    setSelectedSeats((current) =>
      current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id]
    );
  };

  const handleCheckout = () => {
    if (!showtime) return;

    navigate('/cinema/checkout', {
      state: {
        showtimeId: showtime.id,
        movieId: showtime.movieId,
        movieTitle: showtime.movie.title,
        cinemaId: showtime.cinemaId,
        cinemaName: showtime.cinemaName,
        auditoriumId: showtime.auditoriumId,
        auditoriumName: showtime.auditoriumName,
        showDate: showtime.showDate,
        time: showtime.startTime,
        seatIds: selectedSeats,
        seats: selectedSeatLabels,
        totalPrice,
        price: showtime.price,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
          <p className="cinema-empty">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!showtime || error) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
          <p className="cinema-empty">{error || t('cinema.noShowtimes')}</p>
          <Link to="/cinema/now-showing" className="btn btn-outline">
            {t('cinema.navNowShowing')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <div className="cinema-page-header">
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
        </div>

        <div className="cinema-seat-layout">
          <div className="cinema-screen">Screen</div>
          <div className="cinema-seat-grid">
            {seatMap.map((row) => (
              <div key={row.row} className="cinema-seat-row">
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
                        className={seatClass}
                        onClick={() => toggleSeat(seat)}
                        disabled={seat.status !== 'available'}
                        title={`${seat.label} ${String(seat.type || 'normal').toUpperCase()}`}
                      >
                        {seat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="cinema-seat-legend">
            <span><i className="legend-dot available" /> Available</span>
            <span><i className="legend-dot selected" /> Selected</span>
            <span><i className="legend-dot reserved" /> Reserved</span>
            <span><i className="legend-dot booked" /> Booked</span>
            <span><i className="legend-dot out" /> Out of service</span>
            <span className="legend-chip vip">VIP</span>
            <span className="legend-chip couple">Couple</span>
          </div>
        </div>

        <div className="cinema-action-bar">
          <div className="cinema-summary">
            <span>{t('cinema.seats')}:</span>
            <strong>{selectedSeatLabels.join(', ') || '-'}</strong>
            <span>{t('cinema.total')}:</span>
            <strong>{formatCurrency(totalPrice)}</strong>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleCheckout} disabled={!selectedSeats.length}>
            {t('cinema.ctaCheckout')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CinemaSeatSelection;
