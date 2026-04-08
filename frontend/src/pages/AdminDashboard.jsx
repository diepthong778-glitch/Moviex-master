import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cachedGet } from '../utils/api';

function AdminDashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    onlineUsers: 0,
    usersByPlan: {
      BASIC: 0,
      STANDARD: 0,
      PREMIUM: 0,
      NONE: 0,
    },
  });
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError('');
        const data = await cachedGet('/api/admin/summary', { ttlMs: 10000 });
        setSummary({
          totalUsers: data?.totalUsers || 0,
          activeSubscriptions: data?.activeSubscriptions || 0,
          onlineUsers: data?.onlineUsers || 0,
          usersByPlan: {
            BASIC: data?.usersByPlan?.BASIC || 0,
            STANDARD: data?.usersByPlan?.STANDARD || 0,
            PREMIUM: data?.usersByPlan?.PREMIUM || 0,
            NONE: data?.usersByPlan?.NONE || 0,
          },
        });
      } catch {
        setError(t('adminDashboardPage.loadFailed'));
      }
    };

    fetchData();
  }, [t]);

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('adminDashboardPage.title')}</h1>
          <p className="page-subtitle">{t('adminDashboardPage.subtitle')}</p>
        </div>
      </div>

      {error && <p className="error-text">{error}</p>}

      <section className="admin-stats">
        <article className="admin-stat-card">
          <span className="admin-stat-label">{t('adminDashboardPage.totalUsers')}</span>
          <strong className="admin-stat-value">{summary.totalUsers}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">{t('adminDashboardPage.activeSubscriptions')}</span>
          <strong className="admin-stat-value">{summary.activeSubscriptions}</strong>
        </article>
        <article className="admin-stat-card">
          <span className="admin-stat-label">{t('adminDashboardPage.onlineUsers')}</span>
          <strong className="admin-stat-value">{summary.onlineUsers}</strong>
        </article>
      </section>

      <section className="account-panel">
        <div className="panel-header">
          <h2 className="panel-title">{t('adminDashboardPage.usersByPlan')}</h2>
        </div>
        <div className="account-grid">
          <div>
            <span className="label-text">{t('common.plansLabel.BASIC')}</span>
            <p className="value-text">{summary.usersByPlan.BASIC || 0}</p>
          </div>
          <div>
            <span className="label-text">{t('common.plansLabel.STANDARD')}</span>
            <p className="value-text">{summary.usersByPlan.STANDARD || 0}</p>
          </div>
          <div>
            <span className="label-text">{t('common.plansLabel.PREMIUM')}</span>
            <p className="value-text">{summary.usersByPlan.PREMIUM || 0}</p>
          </div>
          <div>
            <span className="label-text">{t('common.plansLabel.NONE')}</span>
            <p className="value-text">{summary.usersByPlan.NONE || 0}</p>
          </div>
        </div>
      </section>

      <section className="account-panel">
        <div className="admin-form-actions">
          <Link className="btn btn-primary" to="/admin/users">{t('adminDashboardPage.openUserManagement')}</Link>
          <Link className="btn btn-outline" to="/admin/cinema">Open Cinema Admin</Link>
          <Link className="btn btn-outline" to="/admin/realtime">{t('adminDashboardPage.openRealtimeActivity')}</Link>
          <Link className="btn btn-outline" to="/admin">{t('adminDashboardPage.openMovieConfig')}</Link>
        </div>
      </section>
    </div>
  );
}

export default AdminDashboard;
