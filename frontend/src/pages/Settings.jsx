import { useEffect, useState } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { authHeaders, cachedGet, invalidateApiCache } from '../utils/api';

const applyTheme = (darkMode) => {
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  localStorage.setItem('moviex.theme', darkMode ? 'dark' : 'light');
};

function Settings() {
  const { user, getToken, login } = useAuth();
  const { t, i18n } = useTranslation();
  const token = getToken();
  const persistedLanguage = localStorage.getItem('moviex.language') || i18n.resolvedLanguage || 'en';
  const [form, setForm] = useState({
    language: persistedLanguage,
    darkMode: localStorage.getItem('moviex.theme') !== 'light',
    subtitle: localStorage.getItem('moviex.subtitle.enabled') !== 'false',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await cachedGet('/api/users/profile', {
          ttlMs: 15000,
          config: { headers: authHeaders(token) },
        });

        const nextForm = {
          language: persistedLanguage,
          darkMode:
            typeof data.darkMode === 'boolean'
              ? data.darkMode
              : localStorage.getItem('moviex.theme') !== 'light',
          subtitle:
            data.subtitle !== undefined
              ? !!data.subtitle
              : localStorage.getItem('moviex.subtitle.enabled') !== 'false',
        };
        setForm(nextForm);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [persistedLanguage, token]);

  useEffect(() => {
    applyTheme(form.darkMode);
    localStorage.setItem('moviex.subtitle.enabled', String(form.subtitle));
  }, [form.darkMode, form.subtitle]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    if (name === 'language') {
      localStorage.setItem('moviex.language', value);
      i18n.changeLanguage(value);
    }
    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage('');

      const response = await axios.put('/api/user/settings', form, {
        headers: authHeaders(token),
      });

      login({ ...user, ...response.data, ...form });
      invalidateApiCache('/api/users/profile');
      invalidateApiCache('/api/subscription');
      setMessage(t('settingsPage.saved'));
    } catch {
      setMessage(t('settingsPage.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <p className="muted-text">{t('settingsPage.loading')}</p>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="page-header">
        <div>
          <h2 className="page-title">{t('settingsPage.title')}</h2>
          <p className="page-subtitle">{t('settingsPage.subtitle')}</p>
        </div>
      </div>

      <form className="settings-form" onSubmit={handleSubmit}>
        <label className="field-row">
          <span>{t('common.language')}</span>
          <select name="language" value={form.language} onChange={handleChange} className="field-control">
            <option value="en">English</option>
            <option value="vi">Vietnamese</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
            <option value="ko">Korean</option>
          </select>
        </label>

        <label className="field-row switch-row">
          <span>{t('common.darkMode')}</span>
          <input type="checkbox" name="darkMode" checked={form.darkMode} onChange={handleChange} />
        </label>

        <label className="field-row switch-row">
          <span>{t('common.subtitles')}</span>
          <input type="checkbox" name="subtitle" checked={form.subtitle} onChange={handleChange} />
        </label>

        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? t('settingsPage.saving') : t('common.saveSettings')}
        </button>

        {message && <p className="muted-text">{message}</p>}
      </form>
    </div>
  );
}

export default Settings;
