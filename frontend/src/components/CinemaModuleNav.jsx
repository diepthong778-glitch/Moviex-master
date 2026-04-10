import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function CinemaModuleNav() {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { to: '/cinema', label: t('common.home') },
    { to: '/cinema/now-showing', label: t('cinema.navNowShowing') },
    { to: '/cinema/schedule', label: t('cinema.navSchedule') },
    { to: '/cinema/locations', label: t('cinema.navLocations') },
    { to: '/cinema/tickets', label: t('cinema.navTickets') },
  ];

  const isActive = (path) => {
    if (path === '/cinema') {
      return location.pathname === '/cinema';
    }
    if (path === '/cinema/now-showing') {
      return (
        location.pathname.startsWith('/cinema/now-showing')
        || location.pathname.startsWith('/cinema/movie')
        || location.pathname.startsWith('/cinema/seats')
        || location.pathname.startsWith('/cinema/checkout')
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <section className="cinema-module-nav" aria-label={t('cinema.moduleNavAria')}>
      <div className="cinema-module-brand">
        <span className="cinema-module-kicker">{t('cinema.moduleKicker')}</span>
        <p className="cinema-module-title">
          <span>{t('cinema.moduleStreaming')}</span>
          <strong>{t('cinema.moduleCinema')}</strong>
        </p>
      </div>
      <nav className="cinema-module-links">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`cinema-module-link${isActive(item.to) ? ' is-active' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </section>
  );
}

export default CinemaModuleNav;
