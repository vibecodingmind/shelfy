import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { I18nProvider } from './i18n/context.tsx';
import { ThemeProvider } from './theme/ThemeContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ThemeProvider>
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
