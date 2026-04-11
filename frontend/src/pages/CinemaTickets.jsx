import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import CinemaBookingProgress from '../components/CinemaBookingProgress';
import CinemaModuleNav from '../components/CinemaModuleNav';
import { buildQrCodeImageUrl, formatCurrency } from '../utils/cinema';

const formatShowtime = (ticket) => {
  const date = ticket?.showDate || '-';
  const start = ticket?.startTime || '--:--';
  const end = ticket?.endTime || '--:--';
  return `${date} ${start} - ${end}`;
};

const formatDateTime = (value, locale = 'vi-VN') => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(locale);
};

const resolveTicketCode = (ticket) => {
  if (ticket?.ticketCode) return ticket.ticketCode;
  if (Array.isArray(ticket?.ticketCodes) && ticket.ticketCodes.length > 0) {
    return ticket.ticketCodes[0];
  }
  return '';
};

function CinemaTickets() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { bookingId, ticketCode } = useParams();
  const { checkRole } = useAuth();
  const isAdmin = checkRole('ROLE_ADMIN');
  const isCheckInRoute = location.pathname.startsWith('/cinema/check-in/');
  const locale = i18n.language || 'vi-VN';

  const [activeTab, setActiveTab] = useState('upcoming');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

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
          setError(fetchError?.response?.data?.message || t('cinema.loadTicketDataFailed'));
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
      setActionMessage('');
      setActionError('');
      return;
    }

    let ignore = false;
    const fetchDetail = async () => {
      setDetailLoading(true);
      setError('');
      setActionMessage('');
      setActionError('');
      try {
        const endpoint = ticketCode
          ? isCheckInRoute
            ? `/api/cinema/tickets/validate/${encodeURIComponent(ticketCode)}`
            : `/api/cinema/tickets/code/${encodeURIComponent(ticketCode)}`
          : `/api/cinema/tickets/${bookingId}`;
        const response = await axios.get(endpoint);
        if (!ignore) {
          setDetail(response.data || null);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || t('cinema.loadTicketDetailFailed'));
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
  }, [bookingId, ticketCode, isCheckInRoute]);

  const validationUrl = useMemo(() => {
    const code = resolveTicketCode(detail);
    if (!code || typeof window === 'undefined') return '';
    return `${window.location.origin}/cinema/check-in/${encodeURIComponent(code)}`;
  }, [detail]);

  const handleCheckIn = async () => {
    const code = resolveTicketCode(detail);
    if (!code || !isAdmin) return;

    try {
      setActionLoading(true);
      setActionError('');
      setActionMessage('');
      const response = await axios.post(`/api/cinema/tickets/code/${encodeURIComponent(code)}/check-in`);
      setDetail(response.data || detail);
      setActionMessage('Ticket checked in successfully.');
    } catch (checkInError) {
      setActionError(checkInError?.response?.data?.message || 'Unable to confirm check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const title = useMemo(() => {
    if (isCheckInRoute) return t('cinema.ticketValidationTitle');
    if (bookingId || ticketCode) return t('cinema.ticketDetailTitle');
    if (activeTab === 'past') return t('cinema.usedPastTickets');
    if (activeTab === 'cancelled') return t('cinema.cancelledFailedTickets');
    if (activeTab === 'admin') return t('cinema.adminBookings');
    return t('cinema.navTickets');
  }, [activeTab, bookingId, isCheckInRoute, ticketCode, t]);

  if (bookingId || ticketCode) {
    const displayCode = resolveTicketCode(detail);
    const qrUrl = buildQrCodeImageUrl(validationUrl, 260);
    const backTarget = isCheckInRoute ? '/cinema' : '/cinema/tickets';
    const canCheckIn = isAdmin
      && detail
      && detail.ticketStatus !== 'CHECKED_IN'
      && detail.bookingStatus === 'CONFIRMED'
      && detail.paymentStatus === 'PAID';

    return (
      <div className="cinema-shell">
        <div className="page-shell cinema-content">
          <CinemaModuleNav />
          <CinemaBookingProgress currentStep="ticket" />
          <div className="cinema-page-header">
              <div>
                <p className="cinema-section-eyebrow">{t('cinema.navTickets')}</p>
                <h1 className="cinema-title">{title}</h1>
                <p className="cinema-subtitle">
                  {isCheckInRoute
                  ? t('cinema.scanValidationPageForBookingVerificationAndAdminCheckIn')
                  : t('cinema.digitalBookingTicketDetails')}
              </p>
            </div>
            <Link to={backTarget} className="btn btn-outline">
              {t('common.previous')}
            </Link>
          </div>

          {detailLoading ? (
            <p className="cinema-empty">{t('common.loading')}</p>
          ) : error ? (
            <p className="cinema-empty">{error}</p>
          ) : !detail ? (
            <p className="cinema-empty">{t('cinema.ticketDetailNotFound')}</p>
          ) : (
            <div className="cinema-ticket-detail-grid">
              <div className="cinema-checkout-card">
                <h3>{detail.movieTitle || t('common.unknownMovie')}</h3>
                <p>{detail.bookingCode || detail.bookingId}</p>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.ticketCode')}</span>
                  <strong>{displayCode || '-'}</strong>
                </div>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.cinemaLabel')}</span>
                  <strong>{detail.cinemaName || '-'}</strong>
                </div>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.auditoriumLabel')}</span>
                  <strong>{detail.auditoriumName || '-'}</strong>
                </div>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.timeLabel')}</span>
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
                  <span>{t('cinema.bookingStatus')}</span>
                  <strong>{detail.bookingStatus || '-'}</strong>
                </div>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.paymentStatus')}</span>
                  <strong>{detail.paymentStatus || '-'}</strong>
                </div>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.ticketStatus')}</span>
                  <strong>{detail.ticketStatus || '-'}</strong>
                </div>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.checkedInAt')}</span>
                  <strong>{formatDateTime(detail.checkedInAt, locale)}</strong>
                </div>
                <div className="cinema-checkout-row">
                  <span>{t('cinema.createdAt')}</span>
                  <strong>{formatDateTime(detail.createdAt || detail.issuedAt, locale)}</strong>
                </div>
                {validationUrl && (
                  <div className="cinema-checkout-row cinema-checkout-row-wrap">
                    <span>{t('cinema.validationUrl')}</span>
                    <strong className="cinema-validation-url">{validationUrl}</strong>
                  </div>
                )}
              </div>

              <div className="cinema-checkout-card accent">
                <h3>{isCheckInRoute ? t('cinema.ticketValidationQrTitle') : t('cinema.ticketQrTitle')}</h3>
                {displayCode ? (
                  <>
                    <div className="cinema-ticket-qr-shell">
                      <img className="cinema-ticket-qr" src={qrUrl} alt={t('cinema.ticketQrAlt', { code: displayCode })} loading="lazy" />
                    </div>
                    <div className="cinema-ticket-barcode" aria-label={t('cinema.ticketCodeDisplay')}>
                      <span>{displayCode}</span>
                    </div>
                    <p className="cinema-price-note">
                      {isCheckInRoute ? t('cinema.ticketQrOpensCheckInPage') : t('cinema.ticketQrOpensDetailPage')}
                    </p>
                    <p className="cinema-price-note">
                      {t('cinema.ticketQrNotPaymentQr')}
                    </p>
                  </>
                ) : (
                  <p className="cinema-empty">{t('cinema.noTicketCodeAvailable')}</p>
                )}

                {isCheckInRoute && isAdmin && canCheckIn && (
                  <button
                    type="button"
                    className="btn btn-primary cinema-stack-btn"
                    onClick={handleCheckIn}
                    disabled={actionLoading}
                  >
                    {actionLoading ? t('cinema.checkingIn') : t('cinema.confirmCheckIn')}
                  </button>
                )}

                {isCheckInRoute && !isAdmin && (
                  <p className="cinema-note">{t('cinema.adminLoginRequiredToConfirmCheckIn')}</p>
                )}

                {actionMessage && <p className="cinema-note">{actionMessage}</p>}
                {actionError && <p className="cinema-note cinema-note-error">{actionError}</p>}
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
            <p className="cinema-subtitle">{t('cinema.upcomingUsedAndCancelledCinemaBookings')}</p>
          </div>
        </div>

        <div className="cinema-actions cinema-actions-spaced">
          <button
            type="button"
            className={`btn ${activeTab === 'upcoming' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('upcoming')}
          >
            {t('cinema.upcomingTickets')}
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'past' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('past')}
          >
            {t('cinema.usedPastTickets')}
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'cancelled' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setActiveTab('cancelled')}
          >
            {t('cinema.cancelledFailedTickets')}
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`btn ${activeTab === 'admin' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('admin')}
            >
              {t('cinema.adminBookings')}
            </button>
          )}
        </div>

        {loading ? (
          <p className="cinema-empty">{t('common.loading')}</p>
        ) : error ? (
          <p className="cinema-empty">{error}</p>
        ) : tickets.length === 0 ? (
          <p className="cinema-empty">{t('cinema.noTicketDataAvailable')}</p>
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
                    <h3>{ticket.movieTitle || t('common.unknownMovie')}</h3>
                    <span>{ticket.bookingStatus || '-'}</span>
                  </div>
                  <p><strong>{ticket.bookingCode || ticket.bookingId}</strong></p>
                  <p>{t('cinema.ticketCode')}: {code || '-'}</p>
                  <p>{ticket.cinemaName || '-'} - {ticket.auditoriumName || '-'}</p>
                  <p>{formatShowtime(ticket)}</p>
                  <p>{t('cinema.seats')}: {Array.isArray(ticket.seats) && ticket.seats.length ? ticket.seats.join(', ') : '-'}</p>
                  <p>{t('cinema.total')}: {formatCurrency(ticket.totalAmount || 0)}</p>
                  <p>{t('cinema.paymentStatus')}: {ticket.paymentStatus || '-'}</p>
                  <p>{t('cinema.ticketStatus')}: {ticket.ticketStatus || '-'}</p>
                  <p>{t('cinema.createdAt')}: {formatDateTime(ticket.createdAt || ticket.issuedAt, locale)}</p>
                  {ticket.userEmail && <p>{t('common.user')}: {ticket.userEmail}</p>}
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

