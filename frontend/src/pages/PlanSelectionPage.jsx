import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { PLAN_OPTIONS, formatVnd } from '../utils/payment';

function PlanSelectionPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSelectPlan = (packageId) => {
    const targetPath = `/payment?packageId=${encodeURIComponent(packageId)}`;
    if (!user) {
      navigate(targetPath);
      return;
    }
    navigate(targetPath);
  };

  return (
    <div className="page-shell sandbox-page-shell">
      <div className="sandbox-page-head">
        <div>
          <p className="sandbox-eyebrow">{t('plansPage.badge')}</p>
          <h1 className="sandbox-hero-title">{t('plansPage.title')}</h1>
          <p className="sandbox-hero-subtitle">
            {t('plansPage.subtitle')}
          </p>
        </div>
      </div>

      <div className="sandbox-plan-grid">
        {PLAN_OPTIONS.map((plan) => {
          const planName = t(`plansPage.plans.${plan.key}.name`);
          const planDescription = t(`plansPage.plans.${plan.key}.description`);
          const planFeatures = t(`plansPage.plans.${plan.key}.features`, { returnObjects: true });

          return (
            <article key={plan.key} className="sandbox-panel sandbox-plan-card">
              <div className="sandbox-plan-head">
                <p className="sandbox-eyebrow">{plan.key}</p>
                <h2 className="sandbox-title">{planName}</h2>
                <p className="sandbox-plan-description">{planDescription}</p>
              </div>

              <div className="sandbox-plan-price">{formatVnd(plan.price)}</div>

              <div className="sandbox-feature-list">
                {(Array.isArray(planFeatures) ? planFeatures : []).map((feature) => (
                  <div className="sandbox-feature-item" key={feature}>
                    <span />
                    <p>{feature}</p>
                  </div>
                ))}
              </div>

              <button type="button" className="btn btn-primary sandbox-btn" onClick={() => handleSelectPlan(plan.packageId)}>
                {t('plansPage.payWithSandboxQr')}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default PlanSelectionPage;
