import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    if (window.location.protocol !== 'https:') return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline shell is optional; API traffic is never cached.
    });
  });
}
