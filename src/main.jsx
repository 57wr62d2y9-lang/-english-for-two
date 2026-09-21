import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './AppV4.jsx';
import './styles.css';

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#f7f5f8'); } catch {}
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
