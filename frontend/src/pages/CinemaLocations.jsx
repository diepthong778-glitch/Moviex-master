import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CinemaModuleNav from '../components/CinemaModuleNav';
import { fetchCinemas } from '../utils/cinemaApi';

function CinemaLocations() {
  const { t } = useTranslation();
  const [cinemas, setCinemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    const loadLocations = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchCinemas();
        if (!ignore) {
          setCinemas(data);
        }
      } catch (fetchError) {
        if (!ignore) {
          setError(fetchError?.response?.data?.message || 'Unable to load cinema locations.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadLocations();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="cinema-shell">
      <div className="page-shell cinema-content">
        <CinemaModuleNav />
        <div className="cinema-page-header">
          <div>
            <p className="cinema-section-eyebrow">{t('cinema.navLocations')}</p>
            <h1 className="cinema-title">{t('cinema.navLocations')}</h1>
            <p className="cinema-subtitle">{t('cinema.selectCinema')}</p>
          </div>
        </div>

        {loading ? (
          <p className="cinema-empty">{t('common.loading')}</p>
        ) : error ? (
          <p className="cinema-empty">{error}</p>
        ) : cinemas.length === 0 ? (
          <p className="cinema-empty">{t('cinema.noShowtimes')}</p>
        ) : (
          <div className="cinema-branch-grid">
            {cinemas.map((branch) => (
              <div key={branch.id} className="cinema-branch-card">
                <h3>{branch.name}</h3>
                <p>{branch.address}</p>
                <span>{branch.city}</span>
                <div className="cinema-branch-tags">
                  {(branch.features || []).map((feature) => (
                    <span key={feature}>{feature}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default CinemaLocations;
