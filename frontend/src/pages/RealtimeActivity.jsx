import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

function RealtimeActivity() {
  const [events, setEvents] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOnlineUsers = async () => {
      try {
        const response = await axios.get('/api/admin/online-users');
        setOnlineUsers(Array.isArray(response.data) ? response.data : []);
      } catch {
        setError('Failed to load realtime data.');
      }
    };

    fetchOnlineUsers();
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://localhost:8080/ws/activity`);

    socket.onmessage = (message) => {
      try {
        const payload = JSON.parse(message.data);
        setEvents((current) => [payload, ...current].slice(0, 100));
      } catch {
        // Ignore invalid payload
      }
    };

    socket.onerror = () => {
      setError('Realtime websocket disconnected.');
    };

    return () => socket.close();
  }, []);

  const onlineCount = useMemo(() => onlineUsers.length, [onlineUsers]);

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Realtime Activity</h1>
          <p className="page-subtitle">Live admin feed: login, logout, watching, subscription activation</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span className="admin-stat-label">Users Online</span>
          <strong className="admin-stat-value">{onlineCount}</strong>
        </article>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">Online Users</h2>
        </div>
        <div className="history-list">
          {onlineUsers.length === 0 && <p className="muted-text">No users online.</p>}
          {onlineUsers.map((user) => (
            <div key={user.userId} className="history-item">
              <div>
                <h3>{user.email}</h3>
                <p className="muted-text">{user.currentlyWatching || 'Idle'}</p>
              </div>
              <div className="history-meta">
                <span>Last seen: {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : '-'}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">Live Event Feed</h2>
        </div>
        <div className="history-list">
          {events.length === 0 && <p className="muted-text">Waiting for events...</p>}
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
