import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { buildWebSocketUrl } from '../utils/api';

function RealtimeActivity() {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');

  const fetchOnlineUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await axios.get('/api/admin/online-users');
      setOnlineUsers(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch {
      setError(t('realtimeActivityPage.loadFailed'));
    } finally {
      setLoadingUsers(false);
    }
  }, [t]);

  useEffect(() => {
    fetchOnlineUsers();
  }, [fetchOnlineUsers]);

  useEffect(() => {
    let socket;

    try {
      socket = new WebSocket(buildWebSocketUrl('/ws/activity'));
    } catch {
      setConnectionStatus('DISCONNECTED');
      setError(t('realtimeActivityPage.disconnected'));
      return undefined;
    }

    socket.onopen = () => {
      setConnectionStatus('CONNECTED');
      setError('');
    };

    socket.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data);
        setEvents((current) => [payload, ...current].slice(0, 100));
      } catch {
        // Ignore invalid payload
      }
    };

    socket.onerror = () => {
      setConnectionStatus('DISCONNECTED');
      setError(t('realtimeActivityPage.disconnected'));
    };

    socket.onclose = () => {
      setConnectionStatus('DISCONNECTED');
    };

    return () => {
      if (socket && socket.readyState !== WebSocket.CLOSED) {
        socket.close();
      }
    };
  }, [t]);

  const onlineCount = useMemo(() => onlineUsers.length, [onlineUsers]);

  return (
    <div className="page-shell admin-shell realtime-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('realtimeActivityPage.title')}</h1>
          <p className="page-subtitle">{t('realtimeActivityPage.subtitle')}</p>
        </div>
        <button type="button" className="btn btn-outline" onClick={fetchOnlineUsers}>
          Refresh
        </button>
      </div>

      {error && <p className="error-text">{error}</p>}

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span className="admin-stat-label">{t('realtimeActivityPage.usersOnline')}</span>
          <strong className="admin-stat-value">{onlineCount}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">WebSocket</span>
          <strong className={`realtime-status realtime-status-${connectionStatus.toLowerCase()}`}>
            {connectionStatus}
          </strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Live Events</span>
          <strong className="admin-stat-value">{events.length}</strong>
        </article>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('realtimeActivityPage.onlineUsers')}</h2>
        </div>
        <div className="history-list">
          {loadingUsers && <p className="muted-text">{t('common.loading')}</p>}
          {!loadingUsers && onlineUsers.length === 0 && <p className="muted-text">{t('realtimeActivityPage.noUsersOnline')}</p>}
          {onlineUsers.map((user) => (
            <div key={user.userId} className="history-item">
              <div>
                <h3>{user.email}</h3>
                <p className="muted-text">{user.currentlyWatching || t('realtimeActivityPage.idle')}</p>
              </div>
              <div className="history-meta">
                <span>{t('realtimeActivityPage.lastSeen', { value: user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : '-' })}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('realtimeActivityPage.liveEventFeed')}</h2>
        </div>
        <div className="history-list">
          {events.length === 0 && <p className="muted-text">{t('realtimeActivityPage.waitingForEvents')}</p>}
          {events.map((event, index) => (
            <div key={`${event.timestamp}-${index}`} className="history-item">
              <div>
                <h3>{event.type}</h3>
                <p className="muted-text">{event.email}</p>
              </div>
              <div className="history-meta">
                <span>{event.movieTitle || event.planType || '-'}</span>
                <span>{event.timestamp ? new Date(event.timestamp).toLocaleString() : '-'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default RealtimeActivity;
