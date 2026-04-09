import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import CinemaModuleNav from '../components/CinemaModuleNav';
import { formatCurrency } from '../utils/cinema';

const formatShowtime = (ticket) => {
  const date = ticket?.showDate || '-';
  const start = ticket?.startTime || '--:--';
  const end = ticket?.endTime || '--:--';
  return `${date} ${start} - ${end}`;
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
};

const resolveTicketCode = (ticket) => {
  if (ticket?.ticketCode) return ticket.ticketCode;
  if (Array.isArray(ticket?.ticketCodes) && ticket.ticketCodes.length > 0) {
    return ticket.ticketCodes[0];
  }
  return '';
};

const buildQrUrl = (ticketCode) => {
  if (!ticketCode) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(ticketCode)}`;
};

function CinemaTickets() {
  const { t } = useTranslation();
  const { bookingId, ticketCode } = useParams();
  const { checkRole } = useAuth();
  const isAdmin = checkRole('ROLE_ADMIN');

  const [activeTab, setActiveTab] = useState('upcoming');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (bookingId || ticketCode) return;

    let ignore = false;
    const fetchList = async () => {
      setLoading(true);
      setError('');
      try {
        let response;
        if (activeTab === 'admin') {
          response = await axios.get('/api/cinema/tickets/admin/bookings');
        } else {
          response = await axios.get('/api/cinema/tickets/my', {
            params: {
              segment: activeTab,
            },
          });
        }

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
  }, [activeTab, bookingId, ticketCode]);

  useEffect(() => {
    if (!bookingId && !ticketCode) {
      setDetail(null);
      return;
    }

    let ignore = false;
    const fetchDetail = async () => {
      setDetailLoading(true);
      setError('');
      try {
        const endpoint = ticketCode
          ? `/api/cinema/tickets/code/${encodeURIComponent(ticketCode)}`
          : `/api/cinema/tickets/${bookingId}`;
        const response = await axios.get(endpoint);
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
  }, [bookingId, ticketCode]);

  const title = useMemo(() => {
    if (bookingId || ticketCode) return 'Ticket Detail';
    if (activeTab === 'past') return 'Used / Past Tickets';
    if (activeTab === 'cancelled') return 'Cancelled / Failed';
    if (activeTab === 'admin') return 'Admin Booking Inspector';
    return t('cinema.navTickets');
  }, [activeTab, bookingId, ticketCode, t]);

  if (bookingId || ticketCode) {
    const displayCode = resolveTicketCode(detail);
    const qrUrl = buildQrUrl(displayCode);

    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
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
            <div className="cinema-ticket-detail-grid">
              <div className="cinema-checkout-card">
                <h3>{detail.movieTitle || 'Unknown movie'}</h3>
                <p>{detail.bookingCode || detail.bookingId}</p>
                <div className="cinema-checkout-row">
                  <span>Ticket code</span>
                  <strong>{displayCode || '-'}</strong>
                </div>
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
                <div className="cinema-checkout-row">
                  <span>Created at</span>
                  <strong>{formatDateTime(detail.createdAt || detail.issuedAt)}</strong>
                </div>
              </div>

              <div className="cinema-checkout-card accent">
                <h3>Scan Demo Ticket</h3>
                {displayCode ? (
                  <>
                    <div className="cinema-ticket-qr-shell">
                      <img className="cinema-ticket-qr" src={qrUrl} alt={`QR ${displayCode}`} loading="lazy" />
                    </div>
                    <div className="cinema-ticket-barcode" aria-label="Ticket barcode style preview">
                      <span>{displayCode}</span>
                    </div>
                  </>
                ) : (
                  <p className="cinema-empty">No ticket code available.</p>
                )}
              </div>
            </div>
          )}
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
            <p className="cinema-section-eyebrow">{t('cinema.navTickets')}</p>
            <h1 className="cinema-title">{title}</h1>
            <p className="cinema-subtitle">Upcoming, used and cancelled cinema bookings</p>
          </div>
        </div>

        <div className="cinema-actions cinema-actions-spaced">
          <button
            type="button"
            className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'past' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('past')}
          >
            Used / Past
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'cancelled' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('cancelled')}
          >
            Cancelled / Failed
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
          <p className="cinema-empty">No ticket data available.</p>
        ) : (
          <div className="cinema-ticket-grid">
            {tickets.map((ticket) => {
              const code = resolveTicketCode(ticket);
              const target = code
                ? `/cinema/tickets/code/${encodeURIComponent(code)}`
                : `/cinema/tickets/${ticket.bookingId}`;

              return (
                <Link key={`${ticket.bookingId}-${code || 'detail'}`} to={target} className="cinema-ticket-card">
                  <div className="cinema-ticket-head">
                    <h3>{ticket.movieTitle || 'Unknown movie'}</h3>
                    <span>{ticket.bookingStatus || '-'}</span>
                  </div>
                  <p><strong>{ticket.bookingCode || ticket.bookingId}</strong></p>
                  <p>Ticket: {code || '-'}</p>
                  <p>{ticket.cinemaName || '-'} - {ticket.auditoriumName || '-'}</p>
                  <p>{formatShowtime(ticket)}</p>
                  <p>{t('cinema.seats')}: {Array.isArray(ticket.seats) && ticket.seats.length ? ticket.seats.join(', ') : '-'}</p>
                  <p>{t('cinema.total')}: {formatCurrency(ticket.totalAmount || 0)}</p>
                  <p>Payment: {ticket.paymentStatus || '-'}</p>
                  <p>Created: {formatDateTime(ticket.createdAt || ticket.issuedAt)}</p>
                  {ticket.userEmail && <p>User: {ticket.userEmail}</p>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default CinemaTickets;
