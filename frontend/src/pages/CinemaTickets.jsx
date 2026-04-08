import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/cinema';

const formatShowtime = (ticket) => {
  const date = ticket?.showDate || '-';
  const start = ticket?.startTime || '--:--';
  const end = ticket?.endTime || '--:--';
  return `${date} ${start} - ${end}`;
};

function CinemaTickets() {
  const { t } = useTranslation();
  const { bookingId } = useParams();
  const { checkRole } = useAuth();
  const isAdmin = checkRole('ROLE_ADMIN');

  const [activeTab, setActiveTab] = useState('upcoming');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (bookingId) return;
    let ignore = false;
    const fetchList = async () => {
      setLoading(true);
      setError('');
      try {
        let endpoint = '/api/cinema/tickets/upcoming';
        if (activeTab === 'history') endpoint = '/api/cinema/tickets/history';
        if (activeTab === 'admin') endpoint = '/api/cinema/tickets/admin/bookings';

        const response = await axios.get(endpoint);
        if (!ignore) {
          setTickets(Array.isArray(response.data) ? response.data : []);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || 'Unable to load ticket data.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchList();
    return () => {
      ignore = true;
    };
  }, [activeTab, bookingId]);

  useEffect(() => {
    if (!bookingId) {
      setDetail(null);
      return;
    }
    let ignore = false;
    const fetchDetail = async () => {
      setDetailLoading(true);
      setError('');
      try {
        const response = await axios.get(`/api/cinema/tickets/${bookingId}`);
        if (!ignore) {
          setDetail(response.data || null);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || 'Unable to load ticket detail.');
        }
      } finally {
        if (!ignore) {
          setDetailLoading(false);
        }
      }
    };

    fetchDetail();
    return () => {
      ignore = true;
    };
  }, [bookingId]);

  const title = useMemo(() => {
    if (bookingId) return 'Ticket Detail';
    if (activeTab === 'history') return 'Booking History';
    if (activeTab === 'admin') return 'Admin Booking Inspector';
    return t('cinema.navTickets');
  }, [activeTab, bookingId, t]);

  if (bookingId) {
    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <div className="cinema-page-header">
            <div>
              <p className="cinema-section-eyebrow">{t('cinema.navTickets')}</p>
              <h1 className="cinema-title">{title}</h1>
              <p className="cinema-subtitle">Digital booking ticket details</p>
            </div>
            <Link to="/cinema/tickets" className="btn btn-outline">
              {t('common.previous')}
            </Link>
          </div>

          {detailLoading ? (
            <p className="cinema-empty">{t('common.loading')}</p>
          ) : error ? (
            <p className="cinema-empty">{error}</p>
          ) : !detail ? (
            <p className="cinema-empty">Ticket detail not found.</p>
          ) : (
            <div className="cinema-checkout-card">
              <h3>{detail.movieTitle || 'Unknown movie'}</h3>
              <p>{detail.bookingCode || detail.bookingId}</p>
              <div className="cinema-checkout-row">
                <span>Cinema</span>
                <strong>{detail.cinemaName || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.auditorium')}</span>
                <strong>{detail.auditoriumName || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.selectShowtime')}</span>
                <strong>{formatShowtime(detail)}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.seats')}</span>
                <strong>{Array.isArray(detail.seats) && detail.seats.length ? detail.seats.join(', ') : '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>{t('cinema.total')}</span>
                <strong>{formatCurrency(detail.totalAmount || 0)}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>Booking status</span>
                <strong>{detail.bookingStatus || '-'}</strong>
              </div>
              <div className="cinema-checkout-row">
                <span>Payment status</span>
                <strong>{detail.paymentStatus || '-'}</strong>
              </div>
              {Array.isArray(detail.ticketCodes) && detail.ticketCodes.length > 0 && (
                <div className="cinema-checkout-row">
                  <span>Ticket codes</span>
                  <strong>{detail.ticketCodes.join(', ')}</strong>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.navTickets')}</p>
            <h1 className="cinema-title">{title}</h1>
            <p className="cinema-subtitle">Upcoming tickets and booking history</p>
          </div>
        </div>

        <div className="cinema-actions" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('history')}
          >
            Booking History
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Bookings
            </button>
          )}
        </div>

        {loading ? (
          <p className="cinema-empty">{t('common.loading')}</p>
        ) : error ? (
          <p className="cinema-empty">{error}</p>
        ) : tickets.length === 0 ? (
          <p className="cinema-empty">No booking data available.</p>
        ) : (
          <div className="cinema-ticket-grid">
            {tickets.map((ticket) => (
              <Link key={ticket.bookingId} to={`/cinema/tickets/${ticket.bookingId}`} className="cinema-ticket-card">
                <div className="cinema-ticket-head">
                  <h3>{ticket.movieTitle || 'Unknown movie'}</h3>
                  <span>{ticket.bookingStatus || '-'}</span>
                </div>
                <p><strong>{ticket.bookingCode || ticket.bookingId}</strong></p>
                <p>{ticket.cinemaName || '-'} - {ticket.auditoriumName || '-'}</p>
                <p>{formatShowtime(ticket)}</p>
                <p>{t('cinema.seats')}: {Array.isArray(ticket.seats) && ticket.seats.length ? ticket.seats.join(', ') : '-'}</p>
                <p>{t('cinema.total')}: {formatCurrency(ticket.totalAmount || 0)}</p>
                {ticket.userEmail && <p>User: {ticket.userEmail}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CinemaTickets;
