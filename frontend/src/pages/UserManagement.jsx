import { useEffect, useState } from 'react';
import { cachedGet } from '../utils/api';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await cachedGet('/api/admin/users', { ttlMs: 10000 });
        setUsers(Array.isArray(data) ? data : []);
      } catch {
        setError('Failed to load users.');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  return (
    <div className="page-shell admin-shell">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">User table with plan, status and activity</p>
        </div>
      </div>

      {loading && <p className="muted-text">Loading users...</p>}
      {error && <p className="error-text">{error}</p>}

      <div className="account-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Currently Watching</th>
              <th>Last Login</th>
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
    </div>
  );
}

export default UserManagement;
