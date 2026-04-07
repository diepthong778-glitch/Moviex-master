import { useTranslation } from 'react-i18next';
import { cinemaBranches } from '../data/cinemaData';

function CinemaLocations() {
  const { t } = useTranslation();

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.navLocations')}</p>
            <h1 className="cinema-title">{t('cinema.navLocations')}</h1>
            <p className="cinema-subtitle">{t('cinema.selectCinema')}</p>
          </div>
        </div>

        <div className="cinema-branch-grid">
          {cinemaBranches.map((branch) => (
            <div key={branch.id} className="cinema-branch-card">
              <h3>{branch.name}</h3>
              <p>{branch.address}</p>
              <span>{branch.city}</span>
              <div className="cinema-branch-tags">
                {branch.features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CinemaLocations;
