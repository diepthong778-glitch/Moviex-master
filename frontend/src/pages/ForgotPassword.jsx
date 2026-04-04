import { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post('/api/auth/forgot-password', {
        email: email.trim(),
      });
      setSuccess(data.message || 'A temporary password has been sent if the account exists.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Unable to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section" style={{ paddingTop: '120px', minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '420px', width: '100%', background: 'var(--bg-card)', padding: '40px', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ marginBottom: '16px', textAlign: 'center' }}>Forgot Password</h2>
        <p style={{ marginBottom: '24px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
          Enter your email and Moviex will send you a temporary password.
        </p>

        {error && <div style={{ color: 'var(--accent-secondary)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ color: '#4caf50', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Sending...' : 'Send Temporary Password'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          Remembered it? <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>Back to login.</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
