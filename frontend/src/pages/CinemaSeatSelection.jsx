import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { cinemaBranches, cinemaMovies } from '../data/cinemaData';
import { formatCurrency } from '../utils/cinema';

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

const buildFallbackSeatMap = () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return rows.map((row, rowIndex) => ({
    row,
    seats: Array.from({ length: 12 }).map((_, index) => {
      const seatNumber = index + 1;
      const isVipRow = rowIndex >= 2 && rowIndex <= 3;
      const isCoupleRow = rowIndex >= 6;
      const type = isCoupleRow ? 'couple' : isVipRow ? 'vip' : 'normal';
      const status = index === 2 || index === 8 ? 'reserved' : index === 5 ? 'booked' : 'available';
      return {
        id: `${row}${seatNumber}`,
        label: `${row}${seatNumber}`,
        row,
        number: seatNumber,
        type,
        status,
      };
    }),
  }));
};

function CinemaSeatSelection() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { movieId, cinemaId, dayIndex, showDate, time, auditorium, price, showtimeId } = location.state || {};
  const movie = cinemaMovies.find((item) => item.id === movieId);
  const cinema = cinemaBranches.find((branch) => branch.id === cinemaId);
  const [seatMap, setSeatMap] = useState(buildFallbackSeatMap());
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setSelectedSeats([]);
  }, [showtimeId]);

  useEffect(() => {
    let active = true;
    const fetchSeatAvailability = async () => {
      if (!showtimeId) {
        setSeatMap(buildFallbackSeatMap());
        return;
      }
      setIsLoading(true);
      try {
        const response = await axios.get(`/api/cinema/showtimes/${showtimeId}/seats`);
        const data = response.data;
        if (!active) return;
        setSeatMap(buildSeatRows(data));
      } catch (error) {
        if (active) {
          setSeatMap(buildFallbackSeatMap());
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchSeatAvailability();
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

  const totalPrice = useMemo(() => (price || 0) * selectedSeats.length, [price, selectedSeats.length]);

  const toggleSeat = (seat) => {
    if (seat.status !== 'available') return;
    setSelectedSeats((current) =>
      current.includes(seat.id) ? current.filter((id) => id !== seat.id) : [...current, seat.id]
    );
  };

  const handleCheckout = () => {
    navigate('/cinema/checkout', {
      state: {
        movieId,
        cinemaId,
        dayIndex,
        showDate,
        time,
        auditorium,
        showtimeId,
        price,
        seatIds: selectedSeats,
        seats: selectedSeatLabels,
        totalPrice,
      },
    });
  };

  if (!movie || !cinema) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.selectSeats')}</p>
            <h1 className="cinema-title">{movie.title}</h1>
            <p className="cinema-subtitle">
              {cinema.name} - {auditorium} - {time}
            </p>
          </div>
          <Link to={`/cinema/movie/${movie.id}/showtimes`} className="btn btn-outline">
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
          {isLoading && <p className="cinema-empty">Loading seats...</p>}
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
