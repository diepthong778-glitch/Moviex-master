import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const phoneRegex = /^\+?[0-9]{10,15}$/;

function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
    phoneNumber: '',
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};

    if (!form.currentPassword) {
      errors.currentPassword = 'Current password is required.';
    }

    if (form.newPassword.length < 8) {
      errors.newPassword = 'New password must be at least 8 characters.';
    }

    if (form.newPassword !== form.confirmNewPassword) {
      errors.confirmNewPassword = 'New passwords do not match.';
    }

    if (!phoneRegex.test(form.phoneNumber.trim())) {
      errors.phoneNumber = 'Phone number must be 10 to 15 digits and may start with +.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
        confirmNewPassword: form.confirmNewPassword,
        phoneNumber: form.phoneNumber.trim(),
      });
      setSuccess(data.message || 'Password changed successfully.');
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 1200);
    } catch (err) {
      setFieldErrors(err.response?.data?.errors || {});
      setError(err.response?.data?.message || err.message || 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    borderRadius: '4px',
    border: '1px solid var(--border-color)',
    background: 'var(--bg-secondary)',
    color: '#fff',
  };

  const renderFieldError = (name) =>
    fieldErrors[name] ? (
      <div style={{ color: 'var(--accent-secondary)', marginTop: '6px', fontSize: '13px' }}>{fieldErrors[name]}</div>
    ) : null;

  return (
    <div className="section" style={{ paddingTop: '120px', minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '440px', width: '100%', background: 'var(--bg-card)', padding: '40px', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>Change Password</h2>

        {error && <div style={{ color: 'var(--accent-secondary)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ color: '#4caf50', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Current Password</label>
            <input type="password" name="currentPassword" value={form.currentPassword} onChange={handleChange} required style={inputStyle} />
            {renderFieldError('currentPassword')}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>New Password</label>
            <input type="password" name="newPassword" value={form.newPassword} onChange={handleChange} required style={inputStyle} />
            {renderFieldError('newPassword')}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Confirm New Password</label>
            <input type="password" name="confirmNewPassword" value={form.confirmNewPassword} onChange={handleChange} required style={inputStyle} />
            {renderFieldError('confirmNewPassword')}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Phone Number</label>
            <input type="tel" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required style={inputStyle} />
            {renderFieldError('phoneNumber')}
          </div>
          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ChangePassword;
