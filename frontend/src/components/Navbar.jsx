import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaFemale, FaMale, FaRainbow } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout, checkRole } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const isCinemaRoute = location.pathname.startsWith('/cinema');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const userMenuItems = [
    { label: t('common.profile'), path: '/profile' },
    { label: t('common.settings'), path: '/settings' },
    { label: t('common.watchlist'), path: '/watchlist' },
    { label: t('common.history'), path: '/history' },
    { label: t('common.changePassword'), path: '/change-password' },
    { label: t('common.subscription'), path: '/subscription' },
  ];

  const renderGenderIcon = () => {
    if (user?.gender === 'MALE') {
      return <FaMale size={32} />;
    }

    if (user?.gender === 'FEMALE') {
      return <FaFemale size={32} />;
    }

    return <FaRainbow size={32} />;
  };

  const handleMenuNavigate = (path) => {
    setIsDropdownOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar" id="main-navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-logo">MOVIEX</span>
      </Link>
      <div className="navbar-module">
        <button
          type="button"
          className={`navbar-module-btn${!isCinemaRoute ? ' is-active' : ''}`}
          onClick={() => navigate('/browse')}
        >
          {t('navbar.streaming')}
        </button>
        <button
          type="button"
          className={`navbar-module-btn${isCinemaRoute ? ' is-active' : ''}`}
          onClick={() => navigate('/cinema')}
        >
          {t('navbar.cinema')}
        </button>
      </div>
      <div className="navbar-actions">
        <ul className="navbar-nav">
          <li><Link to="/">{t('common.home')}</Link></li>
          <li><Link to="/cinema">{t('navbar.cinema')}</Link></li>
          {user ? (
            <>
              {checkRole('ROLE_ADMIN') && (
                <>
                  <li><Link to="/admin/dashboard" style={{ color: 'var(--accent-secondary)' }}>{t('navbar.adminDashboard')}</Link></li>
                  <li><Link to="/admin/cinema" style={{ color: 'var(--accent-secondary)' }}>Cinema Admin</Link></li>
                  <li><Link to="/admin" style={{ color: 'var(--accent-secondary)' }}>{t('navbar.adminConfig')}</Link></li>
                </>
              )}
            </>
          ) : (
            <>
              <li><Link to="/plans">{t('common.plans')}</Link></li>
              <li><Link to="/login" className="btn btn-outline" style={{ padding: '8px 16px' }}>{t('common.login')}</Link></li>
              <li><Link to="/register" className="btn btn-primary" style={{ padding: '8px 16px' }}>{t('common.signUp')}</Link></li>
            </>
          )}
        </ul>
        {user && (
          <div className="navbar-user-dropdown" ref={dropdownRef}>
            <button
              type="button"
              className={`navbar-user-trigger${isDropdownOpen ? ' is-open' : ''}`}
              onClick={() => setIsDropdownOpen((current) => !current)}
              aria-haspopup="menu"
              aria-expanded={isDropdownOpen}
            >
              <div className="navbar-user-avatar" aria-hidden="true">
                {renderGenderIcon()}
              </div>
              <div className="navbar-user-copy">
                <span className="navbar-user-greeting">{t('navbar.welcomeUser', { username: user.username })}</span>
                <span className="navbar-user-subtitle">{t('navbar.welcomeSubtitle')}</span>
              </div>
            </button>
            {isDropdownOpen && (
              <div className="navbar-user-menu" role="menu">
                {userMenuItems.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    className="navbar-user-menu-item"
                    onClick={() => handleMenuNavigate(item.path)}
                    role="menuitem"
                  >
                    {item.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="navbar-user-menu-item navbar-user-menu-item-logout"
                  onClick={handleLogout}
                  role="menuitem"
                >
                  {t('common.logout')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
