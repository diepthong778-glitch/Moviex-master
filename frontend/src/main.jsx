import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n';
import './main.css';
import { normalizeApiError, setupAxiosInterceptors } from './utils/api';

setupAxiosInterceptors();

if (import.meta.env.DEV && typeof window !== 'undefined') {
  const isExtensionOriginNoise = (reason, filename = '') => {
    const stack = String(
      reason?.stack
      || reason?.originalError?.stack
      || ''
    );
    const source = String(filename || '');
    const pathPrefix = String(reason?.reqInfo?.pathPrefix || '');
    const extensionPathPrefixes = ['/generate', '/site_integration', '/writing'];

    if (stack.includes('chrome-extension://')) return true;
    if (source.startsWith('chrome-extension://')) return true;
    return extensionPathPrefixes.some((prefix) => pathPrefix.startsWith(prefix));
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isExtensionOriginNoise(event.reason)) {
      event.preventDefault();
      return;
    }

    const normalized = normalizeApiError(event.reason, 'Unhandled promise rejection');
    console.error('[Unhandled Promise Rejection]', normalized);

    const hasNonErrorReason = !(event.reason instanceof Error);
    if (hasNonErrorReason) {
      console.error('[Unhandled Promise Rejection Reason]', event.reason);
    }
  });

  window.addEventListener('error', (event) => {
    if (isExtensionOriginNoise(event.error, event.filename)) {
      event.preventDefault();
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
