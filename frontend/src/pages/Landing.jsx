import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const genderOptions = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'LGBT', value: 'LGBT' },
];


function Landing() {
  const { user, getToken, loading, login } = useAuth();
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

  const isAuthed = useMemo(() => Boolean(user && getToken()), [user, getToken]);
  const redirectTarget = useMemo(() => {
    const redirect = searchParams.get('redirect');
    if (redirect && redirect.startsWith('/')) return redirect;
    return '/browse';
  }, [searchParams]);

  if (!loading && isAuthed) {
    return <Navigate to="/browse" replace />;
  }

  useEffect(() => {
    if (step === 'password') {
      passwordRef.current?.focus?.();
    }
  }, [step]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    setEmail(trimmed);
    setError('');

    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid email address.');
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
      setError(err.response?.data?.message || err.message || 'Failed to check account.');
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
      setError(err.response?.data?.message || err.message || 'Sign in failed.');
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

      setRegisteredMessage(data?.message || 'Registered. Please verify your email, then sign in.');
      setStep('registered');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
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
            <a href="#movies" className="transition hover:text-white">Movies</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
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
              Sign In
            </button>
            <Link
              to="/plans"
              className="hidden rounded-full bg-ember px-5 py-2 text-sm font-semibold shadow-[0_12px_30px_rgba(229,9,20,0.35)] transition hover:translate-y-[-1px] md:inline-flex"
            >
              View Plans
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl gap-10 px-6 pb-14 pt-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate">Cinematic streaming, reimagined</p>
            <h1 className="text-4xl font-display font-extrabold leading-tight tracking-tight md:text-6xl">
              Your private cinema. Curated for every mood.
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate md:text-lg">
              Stream award-winning films, premium series, and handpicked collections with immersive picture and sound.
            </p>
            <div className="flex flex-wrap gap-3">
              <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-slate">4K HDR</span>
              <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-slate">Dolby Atmos</span>
              <span className="rounded-full border border-white/15 px-4 py-2 text-xs uppercase tracking-wider text-slate">Offline Ready</span>
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
                Start with your email
              </label>
                  <input
                    id="landing-email"
                    className="mt-3 w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="Email address"
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
                    {checking ? 'Checking…' : 'Get Started'}
                  </button>
                  <button
                    type="button"
                    className="flex-1 rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                    onClick={() => {
                      setStep('email');
                      emailInputRef.current?.focus?.();
                    }}
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Sign in</p>
                  <button type="button" className="text-xs text-slate hover:text-white" onClick={resetToEmail}>
                    Change email
                  </button>
                </div>
                <input className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white" type="email" value={email} disabled />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
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
                  {authLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            )}

            {step === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Create your account</p>
                  <button type="button" className="text-xs text-slate hover:text-white" onClick={resetToEmail}>
                    Change email
                  </button>
                </div>
                <input className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white" type="email" value={email} disabled />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="text"
                  name="username"
                  placeholder="Username"
                  value={registerForm.username}
                  onChange={handleRegisterChange}
                  disabled={authLoading}
                  required
                />
                <input
                  className="w-full rounded-2xl border border-white/10 bg-carbon px-4 py-3 text-sm text-white placeholder:text-slate/70 focus:outline-none focus:ring-2 focus:ring-ember/60"
                  type="tel"
                  name="phoneNumber"
                  placeholder="+84901234567"
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
                  <option value="">Select gender</option>
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
                  placeholder="Password (min 8 characters)"
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
                  placeholder="Confirm password"
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
                  {authLoading ? 'Creating…' : 'Create account'}
                </button>
              </form>
            )}

            {step === 'registered' && (
              <div className="space-y-4 text-sm">
                <p className="text-base font-semibold">Check your email</p>
                <p className="text-slate">{registeredMessage}</p>
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold transition hover:bg-white/10"
                    onClick={() => setStep('password')}
                  >
                    I’ve verified — Sign in
                  </button>
                  <button type="button" className="text-xs text-slate hover:text-white" onClick={resetToEmail}>
                    Use a different email
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section id="movies" className="mx-auto max-w-6xl px-6 pb-16">
          <div className="grid items-center gap-10 rounded-3xl border border-white/10 bg-carbon/70 p-8 shadow-card md:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">Featured Preview</p>
              <h2 className="text-3xl font-display font-bold text-white md:text-4xl">Midnight Archive</h2>
              <p className="text-sm text-slate md:text-base">
                A curated highlight from the Moviex library. Premium-grade visuals, crafted for a cinematic home experience.
              </p>
              <Link
                to="/browse"
                className="inline-flex items-center justify-center rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(229,9,20,0.35)] transition hover:translate-y-[-1px]"
              >
                Explore Library
              </Link>
            </div>
            <div className="flex justify-center md:justify-end">
              <div className="relative aspect-[2/3] w-full max-w-[320px] overflow-hidden rounded-3xl border border-white/10">
                <img
                  src="/posters/p1.svg"
                  alt="Featured poster"
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">Pricing</p>
            <h2 className="text-3xl font-display font-bold md:text-4xl">Plans crafted for every screen</h2>
            <p className="mt-3 text-slate">Upgrade anytime, pause anytime, stream everywhere.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { name: 'Basic', price: 'Free', desc: 'Trailers, previews, and limited collections.' },
              { name: 'Standard', price: '$5/mo', desc: 'Most of the catalog with HD streaming.' },
              { name: 'Premium', price: '$8/mo', desc: 'All access, 4K HDR, offline downloads.' },
            ].map((plan, index) => (
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
                  Choose {plan.name}
                </Link>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate">FAQ</p>
            <h2 className="text-3xl font-display font-bold">Questions, answered</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes. Manage or cancel your plan from your profile in seconds.' },
              { q: 'Do you support offline downloads?', a: 'Premium plans include offline access on supported devices.' },
              { q: 'What devices are supported?', a: 'Stream on web, mobile, smart TVs, and casting devices.' },
              { q: 'Is there a free tier?', a: 'Explore free-to-start collections before committing to a plan.' },
            ].map((item) => (
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
            <p className="text-sm text-slate">Premium cinematic streaming platform built for movie lovers.</p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm text-slate">
            <Link to="/plans" className="hover:text-white">Plans</Link>
            <a href="#movies" className="hover:text-white">Movies</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
