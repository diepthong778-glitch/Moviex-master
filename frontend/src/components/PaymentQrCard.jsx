import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildQrCodeImageUrl, formatVnd } from '../utils/payment';

function PaymentQrCard({ transaction }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!transaction?.qrPayloadUrl || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(transaction.qrPayloadUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (!transaction) return null;

  return (
    <section className="sandbox-panel qr-display-card">
      <div className="sandbox-section-header">
        <div>
          <p className="sandbox-eyebrow">{t('paymentQrCard.badge')}</p>
          <h3 className="sandbox-title">{t('paymentQrCard.title')}</h3>
        </div>
        <span className={`sandbox-status-chip status-${String(transaction.status || '').toLowerCase()}`}>
          {transaction.status}
        </span>
      </div>

      <div className="qr-display-layout">
        <div className="qr-image-shell">
          <img
            src={buildQrCodeImageUrl(transaction.qrPayloadUrl)}
            alt={t('paymentQrCard.qrAlt', { txnCode: transaction.txnCode })}
            className="qr-image"
          />
        </div>

        <div className="sandbox-detail-list">
          <div className="sandbox-detail-row">
            <span>{t('paymentQrCard.virtualAmount')}</span>
            <strong>{formatVnd(transaction.amount)}</strong>
          </div>
          <div className="sandbox-detail-row">
            <span>{t('paymentQrCard.txnCode')}</span>
            <strong>{transaction.txnCode}</strong>
          </div>
          <div className="sandbox-detail-row">
            <span>{t('paymentQrCard.status')}</span>
            <strong>{transaction.status}</strong>
          </div>
          <div className="sandbox-detail-row">
            <span>{t('paymentQrCard.content')}</span>
            <strong>{transaction.paymentContent}</strong>
          </div>
          <div className="sandbox-detail-row">
            <span>{t('paymentQrCard.receiver')}</span>
            <strong>{transaction.receiverName}</strong>
          </div>
          <div className="sandbox-detail-row">
            <span>{t('paymentQrCard.accountNumber')}</span>
            <strong>{transaction.receiverAccount}</strong>
          </div>
        </div>
      </div>

      <div className="sandbox-actions">
        <a className="btn btn-primary sandbox-btn" href={transaction.qrPayloadUrl} target="_blank" rel="noreferrer">
          {t('paymentQrCard.openSandbox')}
        </a>
        <button type="button" className="btn btn-outline sandbox-btn" onClick={handleCopyLink}>
          {copied ? t('paymentQrCard.copied') : t('paymentQrCard.copy')}
        </button>
      </div>
    </section>
  );
}

export default PaymentQrCard;
