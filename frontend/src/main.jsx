import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './i18n';
import './main.css';
import { setupAxiosInterceptors } from './utils/api';

setupAxiosInterceptors();

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
);
