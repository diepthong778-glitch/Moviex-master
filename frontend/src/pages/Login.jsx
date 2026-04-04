import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';

function Login() {
  const { t } = useTranslation();
  const passwordRef = useRef(null);
  const [step, setStep] = useState('email'); // email | password
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (step === 'password') {
      passwordRef.current?.focus?.();
    }
  }, [step]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);
    setError(null);

    if (!trimmed) {
      setError(t('loginPage.validation.requiredEmail'));
      return;
    }

    try {
      setChecking(true);
      const { data } = await axios.post('/api/auth/email-exists', { email: trimmed });
      if (data?.exists) {
        setStep('password');
      } else {
        setError(t('loginPage.validation.noAccount'));
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('loginPage.loginFailed'));
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data } = await axios.post('/api/auth/login', { email: email.trim(), password });

      login(data);
      const redirectPath = searchParams.get('redirect') || '/browse';
      navigate(redirectPath, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('loginPage.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="section" style={{ paddingTop: '120px', minHeight: '80vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ maxWidth: '400px', width: '100%', background: 'var(--bg-card)', padding: '40px', borderRadius: 'var(--radius-lg)' }}>
        <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>{t('loginPage.title')}</h2>
        
        {error && <div style={{ color: 'var(--accent-secondary)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.email')}</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '4px', justifyContent: 'center' }} disabled={checking}>
              {checking ? t('loginPage.checking') : t('loginPage.continue')}
            </button>
          </form>
        )}

        {step === 'password' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.email')}</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.password')}</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                required
                ref={passwordRef}
                style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: '#fff' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '-4px' }}>
              <button type="button" onClick={() => setStep('email')} style={{ color: 'white', textDecoration: 'none', fontSize: '14px', background: 'none', border: 0 }}>
                {t('loginPage.changeEmail')}
              </button>
              <Link to="/forgot-password" style={{ color: 'white', textDecoration: 'none', fontSize: '14px' }}>
                {t('common.forgotPassword')}
              </Link>
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }} disabled={loading}>
              {loading ? t('loginPage.loggingIn') : t('loginPage.title')}
            </button>
          </form>
        )}
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          {t('loginPage.newToMoviex')} <Link to="/register" style={{ color: 'white', textDecoration: 'none' }}>{t('loginPage.signUpNow')}</Link>
        </p>
        <p style={{ marginTop: '12px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          {t('loginPage.alreadySignedIn')} <Link to="/change-password" style={{ color: 'white', textDecoration: 'none' }}>{t('loginPage.changeYourPassword')}</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
