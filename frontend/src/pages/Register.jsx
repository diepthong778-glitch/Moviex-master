import { useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useNavigate, Link } from 'react-router-dom';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;
const genderOptions = ['MALE', 'FEMALE', 'LGBT'];

function Register() {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    gender: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: '' }));
  };

  const validateForm = () => {
    const errors = {};

    if (!form.username.trim()) {
      errors.username = t('registerPage.validation.usernameRequired');
    }

    if (!emailRegex.test(form.email.trim())) {
      errors.email = t('registerPage.validation.invalidEmail');
    }

    if (!phoneRegex.test(form.phoneNumber.trim())) {
      errors.phoneNumber = t('registerPage.validation.invalidPhone');
    }

    if (!genderOptions.includes(form.gender)) {
      errors.gender = t('registerPage.validation.genderRequired');
    }

    if (form.password.length < 8) {
      errors.password = t('registerPage.validation.passwordMin');
    }

    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = t('registerPage.validation.passwordsMismatch');
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim(),
        gender: form.gender,
        password: form.password,
        confirmPassword: form.confirmPassword,
      };
      const { data } = await axios.post('/api/auth/register', payload);
      setSuccess(data.message);
      setForm({
        username: '',
        email: '',
        phoneNumber: '',
        gender: '',
        password: '',
        confirmPassword: '',
      });
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setFieldErrors(err.response?.data?.errors || {});
      setError(err.response?.data?.message || err.message || t('registerPage.registrationFailed'));
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
        <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>{t('registerPage.title')}</h2>
        
        {error && <div style={{ color: 'var(--accent-secondary)', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ color: '#4caf50', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{success}</div>}
        
        {!success && (
          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.username')}</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                style={inputStyle}
              />
              {renderFieldError('username')}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.email')}</label>
              <input 
                type="email" 
                name="email"
                value={form.email} 
                onChange={handleChange}
                required
                style={inputStyle}
              />
              {renderFieldError('email')}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.phoneNumber')}</label>
              <input
                type="tel"
                name="phoneNumber"
                value={form.phoneNumber}
                onChange={handleChange}
                placeholder="+84901234567"
                required
                style={inputStyle}
              />
              {renderFieldError('phoneNumber')}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.gender')}</label>
              <select
                name="gender"
                value={form.gender}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="">{t('registerPage.selectGender')}</option>
                <option value="MALE">{t('common.male')}</option>
                <option value="FEMALE">{t('common.female')}</option>
                <option value="LGBT">{t('common.lgbt')}</option>
              </select>
              {renderFieldError('gender')}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.password')}</label>
              <input 
                type="password" 
                name="password"
                value={form.password} 
                onChange={handleChange}
                required
                style={inputStyle}
              />
              {renderFieldError('password')}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>{t('common.confirmPassword')}</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                style={inputStyle}
              />
              {renderFieldError('confirmPassword')}
            </div>
            <button type="submit" className="btn btn-primary" style={{ marginTop: '16px', justifyContent: 'center' }} disabled={loading}>
              {loading ? t('registerPage.signingUp') : t('registerPage.title')}
            </button>
          </form>
        )}
        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: 'var(--text-muted)' }}>
          {t('registerPage.alreadyHaveAccount')} <Link to="/login" style={{ color: 'white', textDecoration: 'none' }}>{t('registerPage.signInNow')}</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
