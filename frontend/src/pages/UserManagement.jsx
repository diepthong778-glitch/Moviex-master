import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cachedGet } from '../utils/api';

function UserManagement() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await cachedGet('/api/admin/users', {
          ttlMs: 10000,
          cacheKey: `admin-users:${page}:${pageSize}`,
          config: {
            params: {
              page,
              size: pageSize,
            },
          },
        });
        setUsers(Array.isArray(data) ? data : []);
        setHasMore(Array.isArray(data) && data.length === pageSize);
      } catch {
        setError(t('userManagementPage.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, t]);

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t('userManagementPage.title')}</h1>
          <p className="page-subtitle">{t('userManagementPage.subtitle')}</p>
        </div>
      </div>

      {loading && <p className="muted-text">{t('userManagementPage.loading')}</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="account-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('userManagementPage.columns.email')}</th>
              <th>{t('userManagementPage.columns.role')}</th>
              <th>{t('userManagementPage.columns.plan')}</th>
              <th>{t('userManagementPage.columns.status')}</th>
              <th>{t('userManagementPage.columns.currentlyWatching')}</th>
              <th>{t('userManagementPage.columns.lastLogin')}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.plan || 'NONE'}</td>
                <td>{user.status}</td>
                <td>{user.currentlyWatching || '-'}</td>
                <td>{user.lastLogin ? new Date(user.lastLogin).toLocaleString() : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-form-actions" style={{ justifyContent: 'space-between', marginTop: '16px' }}>
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => setPage((current) => Math.max(0, current - 1))}
          disabled={loading || page === 0}
        >
          {t('common.previous') || 'Previous'}
        </button>
        <span className="muted-text">{t('common.page')} {page + 1}</span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setPage((current) => current + 1)}
          disabled={loading || !hasMore}
        >
          {t('common.next') || 'Next'}
        </button>
      </div>
    </div>
  );
}

export default UserManagement;
