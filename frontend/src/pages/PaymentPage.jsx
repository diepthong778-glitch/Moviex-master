import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import PaymentQrCard from '../components/PaymentQrCard';
import { cachedGet } from '../utils/api';
import { formatVnd, resolvePlanOption } from '../utils/payment';

function PaymentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [movie, setMovie] = useState(null);
  const [transaction, setTransaction] = useState(null);
  const [loadingTarget, setLoadingTarget] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const packageId = searchParams.get('packageId') || searchParams.get('planType');
  const movieId = searchParams.get('movieId');
  const redirectPath = searchParams.get('redirect');
  const existingTxnCode = searchParams.get('txnCode');
  const planOption = useMemo(() => resolvePlanOption(packageId), [packageId]);

  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      if (!movieId && !ignore) {
        setMovie(null);
      }

      if (movieId) {
        try {
          setLoadingTarget(true);
          const data = await cachedGet(`/api/movies/${encodeURIComponent(movieId)}`, {
            ttlMs: 30000,
            cacheKey: `movie:payment:${movieId}`,
          });
          if (!ignore) {
            setMovie(data);
          }
        } catch {
          if (!ignore) {
            setError(t('paymentPage.movieNotFound'));
          }
        } finally {
          if (!ignore) {
            setLoadingTarget(false);
          }
        }
      }

      if (existingTxnCode) {
        try {
          const response = await axios.get(`/api/payment/public/transactions/${encodeURIComponent(existingTxnCode)}`);
          if (!ignore) {
            setTransaction(response.data);
          }
        } catch {
          if (!ignore) {
            setError(t('paymentPage.reloadFailed'));
          }
        }
      }
    };

    loadData();

    return () => {
      ignore = true;
    };
  }, [movieId, existingTxnCode]);

  const targetSummary = useMemo(() => {
    if (movie) {
      return {
        title: movie.title,
        subtitle: t('paymentPage.movieSubtitle', { title: movie.title }),
        amount: null,
        details: [
          t('paymentPage.genre', { value: movie.genre || t('paymentPage.updating') }),
          t('paymentPage.year', { value: movie.year || t('paymentPage.updating') }),
          t('paymentPage.requiredPlan', { value: movie.requiredSubscription || 'BASIC' }),
        ],
      };
    }

    if (planOption) {
      return {
        title: t(`plansPage.plans.${planOption.key}.name`),
        subtitle: t('paymentPage.planSubtitle'),
        amount: planOption.price,
        details: Array.isArray(t(`plansPage.plans.${planOption.key}.features`, { returnObjects: true }))
          ? t(`plansPage.plans.${planOption.key}.features`, { returnObjects: true })
          : [],
      };
    }

    return null;
  }, [movie, planOption]);

  const handleCreateTransaction = async () => {
    if (!movieId && !planOption) {
      setError(t('paymentPage.selectTarget'));
      return;
    }

    const normalizedRequiredPlan = String(movie?.requiredSubscription || 'BASIC').toUpperCase();
    if (movie?.id && normalizedRequiredPlan === 'BASIC' && !planOption) {
      navigate(`/browse?play=${encodeURIComponent(movie.id)}`);
      return;
    }

    try {
      setCreating(true);
      setError('');

      const payload = {
        packageId: planOption?.packageId,
        planType: planOption?.key,
        movieId: movie?.id || movieId || null,
        redirectPath: redirectPath || (movieId ? `/browse?play=${movieId}` : '/browse'),
      };

      const response = await axios.post('/api/payment/transactions', payload);
      setTransaction(response.data);
      navigate(
        `/payment?${new URLSearchParams({
          ...(movieId ? { movieId } : {}),
          ...(planOption?.packageId ? { packageId: planOption.packageId } : {}),
          ...(response.data?.txnCode ? { txnCode: response.data.txnCode } : {}),
          ...(redirectPath ? { redirect: redirectPath } : {}),
        }).toString()}`,
        { replace: true }
      );
    } catch (createError) {
      const backendMessage = createError?.response?.data?.message;
      setError(backendMessage || t('paymentPage.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-shell sandbox-page-shell">
      <div className="sandbox-page-head">
        <div>
          <p className="sandbox-eyebrow">{t('paymentPage.badge')}</p>
          <h1 className="sandbox-hero-title">{t('paymentPage.title')}</h1>
          <p className="sandbox-hero-subtitle">
            {t('paymentPage.subtitle')}
          </p>
        </div>
      </div>

      {error && <div className="sandbox-alert sandbox-alert-error">{error}</div>}

      <div className="sandbox-grid">
        <section className="sandbox-panel">
          <div className="sandbox-section-header">
            <div>
              <p className="sandbox-eyebrow">{t('paymentPage.step1')}</p>
              <h2 className="sandbox-title">{t('paymentPage.paymentTargetInfo')}</h2>
            </div>
          </div>

          {loadingTarget ? (
            <p className="muted-text">{t('paymentPage.loadingTarget')}</p>
          ) : targetSummary ? (
            <>
              <div className="sandbox-product-card">
                <div>
                  <h3>{targetSummary.title}</h3>
                  <p>{targetSummary.subtitle}</p>
                </div>
                {targetSummary.amount != null && (
                  <strong className="sandbox-money">{formatVnd(targetSummary.amount)}</strong>
                )}
              </div>

              <div className="sandbox-detail-list">
                {targetSummary.details.map((item) => (
                  <div key={item} className="sandbox-detail-row">
                    <span>{item}</span>
                    <strong>Sandbox</strong>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="muted-text">{t('paymentPage.chooseTargetFirst')}</p>
          )}

          <div className="sandbox-actions">
            <button type="button" className="btn btn-primary sandbox-btn" onClick={handleCreateTransaction} disabled={creating}>
              {creating ? t('paymentPage.creatingQr') : transaction ? t('paymentPage.regenerateQr') : t('paymentPage.createQr')}
            </button>
            <button type="button" className="btn btn-outline sandbox-btn" onClick={() => navigate('/plans')}>
              {t('paymentPage.viewPlans')}
            </button>
          </div>
        </section>

        <section className="sandbox-panel">
          <div className="sandbox-section-header">
            <div>
              <p className="sandbox-eyebrow">{t('paymentPage.step2')}</p>
              <h2 className="sandbox-title">{t('paymentPage.scanGuide')}</h2>
            </div>
          </div>

          <div className="sandbox-step-list">
            <div className="sandbox-step-item">
              <span>1</span>
              <p>{t('paymentPage.guide1')}</p>
            </div>
            <div className="sandbox-step-item">
              <span>2</span>
              <p>{t('paymentPage.guide2')}</p>
            </div>
            <div className="sandbox-step-item">
              <span>3</span>
              <p>{t('paymentPage.guide3')}</p>
            </div>
          </div>
        </section>
      </div>

      {transaction && <PaymentQrCard transaction={transaction} />}
    </div>
  );
}

export default PaymentPage;
