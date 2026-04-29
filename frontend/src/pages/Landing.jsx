import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { cachedGet } from '../utils/api';
import { resolvePosterUrl } from '../utils/media';
import { PLAN_OPTIONS, formatVnd } from '../utils/payment';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resolveSafeRedirectPath = (redirect) => {
  if (typeof redirect !== 'string') return '/browse';
  const trimmed = redirect.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
    return '/browse';
  }
  return trimmed;
};

function Landing() {
  const { user, getToken, loading, login } = useAuth();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('email'); // email | password | register | registered
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [error, setError] = useState('');
  const [registerForm, setRegisterForm] = useState({
    username: '',
    phoneNumber: '',
    gender: '',
    password: '',
    confirmPassword: '',
  });
  const [password, setPassword] = useState('');
  const [registeredMessage, setRegisteredMessage] = useState('');
  const passwordRef = useRef(null);
  const emailInputRef = useRef(null);
  const [featuredMovie, setFeaturedMovie] = useState(null);

  const isAuthed = useMemo(() => Boolean(user && getToken()), [user, getToken]);
  const redirectTarget = useMemo(() => {
    const redirect = searchParams.get('redirect');
    return resolveSafeRedirectPath(redirect);
  }, [searchParams]);
  const genderOptions = useMemo(
    () => [
      { label: t('common.male'), value: 'MALE' },
      { label: t('common.female'), value: 'FEMALE' },
      { label: t('common.lgbt'), value: 'LGBT' },
    ],
    [t]
  );
  const pricingPlans = useMemo(
    () =>
      PLAN_OPTIONS.map((plan) => ({
        key: plan.key,
        name: t(`common.plansLabel.${plan.key}`),
        price: formatVnd(plan.price),
        desc: t(`landingPage.planDescriptions.${plan.key}`),
      })),
    [t]
  );
  const faqItems = useMemo(
    () => [
      { q: t('landingPage.faq.items.cancel.q'), a: t('landingPage.faq.items.cancel.a') },
      { q: t('landingPage.faq.items.downloads.q'), a: t('landingPage.faq.items.downloads.a') },
      { q: t('landingPage.faq.items.devices.q'), a: t('landingPage.faq.items.devices.a') },
      { q: t('landingPage.faq.items.freeTier.q'), a: t('landingPage.faq.items.freeTier.a') },
    ],
    [t]
  );

  if (!loading && isAuthed) {
    return <Navigate to="/browse" replace />;
  }

  useEffect(() => {
    if (step === 'password') {
      passwordRef.current?.focus?.();
    }
  }, [step]);

  useEffect(() => {
    let cancelled = false;

    const loadFeatured = async () => {
      try {
        const data = await cachedGet('/api/movies/search', {
          ttlMs: 60000,
          cacheKey: 'landing:featured',
          config: { params: { page: 0, size: 1, sortBy: 'year', sortDir: 'desc' } },
        });
        const movie = data?.content?.[0];
        if (!cancelled) setFeaturedMovie(movie || null);
      } catch (err) {
        if (!cancelled) setFeaturedMovie(null);
      }
    };

    loadFeatured();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);
    setError('');

    if (!emailRegex.test(trimmed)) {
      setError(t('landingPage.validation.invalidEmail'));
      return;
    }

    try {
      setChecking(true);
      const { data } = await axios.post('/api/auth/email-exists', { email: trimmed });
      if (data?.exists) {
        setStep('password');
      } else {
        setStep('register');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('landingPage.checkAccountFailed'));
    } finally {
      setChecking(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setAuthLoading(true);
      const { data } = await axios.post('/api/auth/login', { email: email.trim(), password });
      login(data);
      window.location.assign(redirectTarget);
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('landingPage.signInFailed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterForm((current) => ({ ...current, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    const payload = {
      username: registerForm.username.trim(),
      email: email.trim(),
      phoneNumber: registerForm.phoneNumber.trim(),
      gender: registerForm.gender,
      password: registerForm.password,
      confirmPassword: registerForm.confirmPassword,
    };

    try {
      setAuthLoading(true);
      const { data } = await axios.post('/api/auth/register', payload);

      if (data?.token) {
        login(data);
        window.location.assign(redirectTarget);
        return;
      }

      setRegisteredMessage(data?.message || t('landingPage.registeredMessage'));
      setStep('registered');
    } catch (err) {
      setError(err.response?.data?.message || err.message || t('landingPage.registrationFailed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const resetToEmail = () => {
    setError('');
    setPassword('');
    setRegisteredMessage('');
    setRegisterForm({
      username: '',
      phoneNumber: '',
      gender: '',
      password: '',
      confirmPassword: '',
    });
    setStep('email');
    emailInputRef.current?.focus?.();
  };

  const featuredPoster = resolvePosterUrl(featuredMovie);
  const featuredTitle = featuredMovie?.title || t('landingPage.featuredPreview');
  const featuredDescription =
    featuredMovie?.description ||
    t('landingPage.featuredDescriptionFallback');

  return (
    <div className="min-h-screen bg-ink text-white relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute -top-40 right-[-10%] h-[460px] w-[460px] rounded-full bg-ember/30 blur-[120px] animate-glowPulse" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[520px] w-[520px] rounded-full bg-rose-500/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
      </div>

      <header className="relative z-10">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="text-3xl font-display font-extrabold tracking-[0.32em] text-ember drop-shadow-[0_8px_24px_rgba(229,9,20,0.45)]">
              MOVIEX
            </span>
          </Link>
          <div className="hidden items-center gap-6 text-sm text-slate md:flex">
            <a href="#movies" className="transition hover:text-white">{t('landingPage.nav.movies')}</a>
            <a href="#pricing" className="transition hover:text-white">{t('landingPage.nav.pricing')}</a>
            <a href="#faq" className="transition hover:text-white">{t('landingPage.nav.faq')}</a>
            <Link to="/cinema" className="transition hover:text-white">{t('navbar.cinema')}</Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold transition hover:border-white/40 hover:bg-white/10"
              onClick={() => {
                setStep('email');
                emailInputRef.current?.focus?.();
              }}
            >
              {t('landingPage.signIn')}
            </button>
            <Link
              to="/plans"
              className="hidden rounded-full bg-ember px-5 py-2 text-sm font-semibold shadow-[0_12px_30px_rgba(229,9,20,0.35)] transition hover:translate-y-[-1px] md:inline-flex"
            >
              {t('Plans')}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-14 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate">{t('landingPage.eyebrow')}</p>
            <h1 className="text-4xl font-display font-extrabold leading-tight tracking-tight md:text-6xl">
              {t('landingPage.heroTitle')}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate md:text-lg">
              {t('landingPage.heroDescription')}
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-slate">{t('landingPage.featureBadges.quality')}</span>
              <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-slate">{t('landingPage.featureBadges.audio')}</span>
              <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-slate">{t('landingPage.featureBadges.offline')}</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-lg animate-fadeUp">
            {error && (
              <div className="mb-4 rounded-2xl border border-ember/40 bg-ember/10 px-4 py-3 text-sm text-emberSoft">
                {error}
              </div>
            )}

            {step === 'email' && (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="landing-email" className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">
                    {t('landingPage.startWithEmail')}
                  </label>
                  <input
                    id="landing-email"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={t('landingPage.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={checking || authLoading}
                    ref={emailInputRef}
                  />
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="flex-1 rounded-2xl bg-ember px-4 py-3 text-sm font-semibold shadow-[0_14px_30px_rgba(229,9,20,0.35)] transition hover:translate-y-[-1px]"
                    disabled={checking || authLoading}
                  >
                    {checking ? t('landingPage.checking') : t('landingPage.getStarted')}
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                    onClick={() => {
                      setStep('email');
                      emailInputRef.current?.focus?.();
                    }}
                  >
                    {t('landingPage.signIn')}
                  </button>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t('landingPage.signInTitle')}</p>
                  <button type="button" className="text-xs text-slate hover:text-white" onClick={resetToEmail}>
                    {t('landingPage.changeEmail')}
                  </button>
                </div>
                <input className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white" type="email" value={email} disabled />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="password"
                  autoComplete="current-password"
                  placeholder={t('common.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={authLoading}
                  ref={passwordRef}
                  required
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-ember px-4 py-3 text-sm font-semibold shadow-[0_14px_30px_rgba(229,9,20,0.35)] transition hover:translate-y-[-1px]"
                  disabled={authLoading}
                >
                  {authLoading ? t('landingPage.signingIn') : t('landingPage.signIn')}
                </button>
              </form>
            )}

            {step === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{t('landingPage.createAccountTitle')}</p>
                  <button type="button" className="text-xs text-slate hover:text-white" onClick={resetToEmail}>
                    {t('landingPage.changeEmail')}
                  </button>
                </div>
                <input className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white" type="email" value={email} disabled />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="text"
                  name="username"
                  placeholder={t('common.username')}
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  disabled={authLoading}
                  required
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="tel"
                  name="phoneNumber"
                  placeholder={t('landingPage.phonePlaceholder')}
                  value={registerForm.phoneNumber}
                  onChange={handleRegisterChange}
                  disabled={authLoading}
                  required
                />
                <select
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ember/60"
                  name="gender"
                  value={registerForm.gender}
                  onChange={handleRegisterChange}
                  disabled={authLoading}
                  required
                >
                  <option value="">{t('landingPage.selectGender')}</option>
                  {genderOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  placeholder={t('landingPage.passwordPlaceholder')}
                  value={registerForm.password}
                  onChange={handleRegisterChange}
                  disabled={authLoading}
                  required
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  placeholder={t('common.confirmPassword')}
                  value={registerForm.confirmPassword}
                  onChange={handleRegisterChange}
                  disabled={authLoading}
                  required
                />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-ember px-4 py-3 text-sm font-semibold shadow-[0_14px_30px_rgba(229,9,20,0.35)] transition hover:translate-y-[-1px]"
                  disabled={authLoading}
                >
                  {authLoading ? t('landingPage.creating') : t('landingPage.createAccountButton')}
                </button>
              </form>
            )}

            {step === 'registered' && (
              <div className="space-y-4 text-sm">
                <p className="text-base font-semibold">{t('landingPage.checkEmail')}</p>
                <p className="text-slate">{registeredMessage}</p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                    onClick={() => setStep('password')}
                  >
                    {t('landingPage.verifiedSignIn')}
                  </button>
                  <button type="button" className="text-xs text-slate hover:text-white" onClick={resetToEmail}>
                    {t('landingPage.useDifferentEmail')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="movies" className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid items-center gap-10 rounded-3xl border border-white/10 bg-carbon/70 p-8 shadow-card md:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">{t('landingPage.featuredPreview')}</p>
              <h2 className="text-3xl font-display font-bold text-white md:text-4xl">{featuredTitle}</h2>
              <p className="text-sm text-slate md:text-base">
                {featuredDescription}
              </p>
              <Link
                to="/browse"
                className="inline-flex items-center justify-center rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(229,9,20,0.35)] transition hover:translate-y-[-1px]"
              >
                {t('landingPage.exploreLibrary')}
              </Link>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="relative aspect-[2/3] w-full max-w-[320px] overflow-hidden rounded-3xl border border-white/10">
                <img
                  src={featuredPoster}
                  alt={featuredTitle}
                  loading="lazy"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/posters/movie-fallback.svg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">{t('landingPage.pricing.label')}</p>
            <h2 className="text-3xl font-display font-bold md:text-4xl">{t('landingPage.pricing.title')}</h2>
            <p className="mt-3 text-slate">{t('landingPage.pricing.subtitle')}</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan, index) => (
              <div
                key={plan.name}
                className={`rounded-3xl border border-white/10 bg-carbon/70 p-6 shadow-card transition hover:-translate-y-1 ${
                  index === 1 ? 'ring-1 ring-ember/60' : ''
                }`}
              >
                <p className="text-sm text-slate">{plan.name}</p>
                <h3 className="mt-3 text-3xl font-display font-bold">{plan.price}</h3>
                <p className="mt-3 text-sm text-slate">{plan.desc}</p>
                <Link
                  to="/plans"
                  className={`mt-6 inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                    index === 1 ? 'bg-ember text-white shadow-[0_14px_30px_rgba(229,9,20,0.35)]' : 'border border-white/15 text-white hover:bg-white/10'
                  }`}
                >
                  {t('landingPage.choosePlanCta', { plan: plan.name })}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">{t('landingPage.faq.label')}</p>
            <h2 className="text-3xl font-display font-bold">{t('landingPage.faq.title')}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {faqItems.map((item) => (
              <details key={item.q} className="rounded-2xl border border-white/10 bg-carbon/60 px-5 py-4">
                <summary className="cursor-pointer text-sm font-semibold">{item.q}</summary>
                <p className="mt-3 text-sm text-slate">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/10 bg-carbon/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-10 md:flex-row md:items-center">
          <div className="space-y-2">
            <p className="text-lg font-display font-extrabold tracking-[0.28em] text-ember">MOVIEX</p>
            <p className="text-sm text-slate">{t('landingPage.footerDescription')}</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate">
            <Link to="/plans" className="hover:text-white">{t('common.plans')}</Link>
            <a href="#movies" className="hover:text-white">{t('landingPage.nav.movies')}</a>
            <a href="#faq" className="hover:text-white">{t('landingPage.nav.faq')}</a>
            <Link to="/cinema" className="hover:text-white">{t('navbar.cinema')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
