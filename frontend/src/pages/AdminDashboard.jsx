import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cachedGet } from '../utils/api';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const [usersData, subsData, onlineData] = await Promise.all([
          cachedGet('/api/admin/users', { ttlMs: 10000 }),
          cachedGet('/api/admin/subscriptions', { ttlMs: 10000 }),
          cachedGet('/api/admin/online-users', { ttlMs: 10000 }),
        ]);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setSubscriptions(Array.isArray(subsData) ? subsData : []);
        setOnlineUsers(Array.isArray(onlineData) ? onlineData : []);
      } catch {
        setError('Failed to load admin dashboard data.');
      }
    };

    fetchData();
  }, []);

  const stats = useMemo(() => {
    const activeSubscriptions = subscriptions.filter((item) => item.status === 'ACTIVE').length;
    const byPlan = users.reduce(
      (acc, user) => {
        const key = user.plan || 'NONE';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      { BASIC: 0, STANDARD: 0, PREMIUM: 0, NONE: 0 }
    );

    return {
      totalUsers: users.length,
      activeSubscriptions,
      onlineUsers: onlineUsers.length,
      usersByPlan: byPlan,
    };
  }, [users, subscriptions, onlineUsers]);

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin Dashboard</h1>
          <p className="page-subtitle">System overview and realtime platform health</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span className="admin-stat-label">Total Users</span>
          <strong className="admin-stat-value">{stats.totalUsers}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Active Subscriptions</span>
          <strong className="admin-stat-value">{stats.activeSubscriptions}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">Online Users</span>
          <strong className="admin-stat-value">{stats.onlineUsers}</strong>
        </article>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">Users by Plan</h2>
        </div>
        <div className="account-grid">
          <div>
            <span className="label-text">BASIC</span>
            <p className="value-text">{stats.usersByPlan.BASIC || 0}</p>
          </div>
          <div>
            <span className="label-text">STANDARD</span>
            <p className="value-text">{stats.usersByPlan.STANDARD || 0}</p>
          </div>
          <div>
            <span className="label-text">PREMIUM</span>
            <p className="value-text">{stats.usersByPlan.PREMIUM || 0}</p>
          </div>
          <div>
            <span className="label-text">NONE</span>
            <p className="value-text">{stats.usersByPlan.NONE || 0}</p>
          </div>
        </div>
      </section>

      <section className="account-panel">
        <div className="admin-form-actions">
          <Link className="btn btn-primary" to="/admin/users">Open User Management</Link>
          <Link className="btn btn-outline" to="/admin/realtime">Open Realtime Activity</Link>
          <Link className="btn btn-outline" to="/admin">Open Movie Config</Link>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
