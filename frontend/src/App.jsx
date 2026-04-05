import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/AuthContext';
import './main.css';

const Admin = lazy(() => import('./pages/Admin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const Home = lazy(() => import('./pages/Home'));
const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const PaymentPage = lazy(() => import('./pages/PaymentPage'));
const PaymentSandboxPage = lazy(() => import('./pages/PaymentSandboxPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const PlanSelectionPage = lazy(() => import('./pages/PlanSelectionPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const RealtimeActivity = lazy(() => import('./pages/RealtimeActivity'));
const Register = lazy(() => import('./pages/Register'));
const Settings = lazy(() => import('./pages/Settings'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const UserManagement = lazy(() => import('./pages/UserManagement'));
const Verify = lazy(() => import('./pages/Verify'));
const WatchHistoryPage = lazy(() => import('./pages/WatchHistoryPage'));
const Watchlist = lazy(() => import('./pages/Watchlist'));

function RouteFallback() {
  const { t } = useTranslation();
  return (
    <div className="page-shell">
      <p className="muted-text">{t('common.loading')}</p>
    </div>
  );
}

function LazyPage({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function BrowseGuard({ children }) {
  const { user, getToken, loading } = useAuth();

  if (loading) return null;
  if (!user || !getToken()) return <Navigate to="/" replace />;
  return children;
}

function AppLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="app">
      {!isLanding && <Navbar />}

      <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route
            path="/browse"
            element={
              <BrowseGuard>
                <LazyPage>
                  <Home />
                </LazyPage>
              </BrowseGuard>
            }
          />
          <Route path="/" element={<LazyPage><Landing /></LazyPage>} />
          <Route path="/login" element={<LazyPage><Login /></LazyPage>} />
          <Route path="/register" element={<LazyPage><Register /></LazyPage>} />
          <Route path="/forgot-password" element={<LazyPage><ForgotPassword /></LazyPage>} />
          <Route path="/verify" element={<LazyPage><Verify /></LazyPage>} />
          <Route path="/plans" element={<LazyPage><PlanSelectionPage /></LazyPage>} />
          <Route path="/payment-sandbox/:txnCode" element={<LazyPage><PaymentSandboxPage /></LazyPage>} />
          <Route path="/payment-success/:txnCode" element={<LazyPage><PaymentSuccessPage /></LazyPage>} />

          <Route element={<ProtectedRoute />}>
            <Route path="/change-password" element={<LazyPage><ChangePassword /></LazyPage>} />
            <Route path="/profile" element={<LazyPage><ProfilePage /></LazyPage>} />
            <Route path="/subscription" element={<LazyPage><SubscriptionPage /></LazyPage>} />
            <Route path="/payment" element={<LazyPage><PaymentPage /></LazyPage>} />
            <Route path="/watchlist" element={<LazyPage><Watchlist /></LazyPage>} />
            <Route path="/history" element={<LazyPage><WatchHistoryPage /></LazyPage>} />
            <Route path="/settings" element={<LazyPage><Settings /></LazyPage>} />
          </Route>

          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<LazyPage><AdminDashboard /></LazyPage>} />
            <Route path="/admin/users" element={<LazyPage><UserManagement /></LazyPage>} />
            <Route path="/admin/realtime" element={<LazyPage><RealtimeActivity /></LazyPage>} />
            <Route path="/admin" element={<LazyPage><Admin /></LazyPage>} />
          </Route>
        </Routes>
      </main>

      {!isLanding && (
        <footer className="footer" id="about">
          <p className="footer-text">
            (c) 2026 <span className="footer-brand">MOVIEX</span> - {t('appLayout.footer')}
          </p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppLayout />
      </Router>
    </AuthProvider>
  );
}

export default App;
