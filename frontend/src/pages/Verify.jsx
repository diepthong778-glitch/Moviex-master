import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { buildApiUrl } from '../utils/api';

function Verify() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('Verifying...');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('Invalid verification link.');
      setStatus('');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch(buildApiUrl(`/api/auth/verify?token=${encodeURIComponent(token)}`));
        const data = await res.json();

        if (!res.ok) throw new Error(data.message || 'Verification failed');
        setStatus(data.message);
        setTimeout(() => navigate('/plans'), 1200);
      } catch (err) {
        setError(err.message);
        setStatus('');
      }
    };

    verifyToken();
  }, [navigate, token]);

  return (
    <div className="section" style={{ paddingTop: '120px', minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '400px', width: '100%', background: 'var(--bg-card)', padding: '40px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '24px' }}>Email Verification</h2>
        
        {error && <div style={{ color: 'var(--accent-secondary)', marginBottom: '16px' }}>{error}</div>}
        {status && <div style={{ color: '#4caf50', marginBottom: '16px' }}>{status}</div>}
        
        <Link to="/plans" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Go to Plan Selection
        </Link>
      </div>
    </div>
  );
}

export default Verify;
