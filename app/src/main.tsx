import './polyfills';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import './styles.css';

async function bootstrap() {
  // Inside Telegram: acknowledge the Mini App handshake and go full height.
  const tma = window.Telegram?.WebApp;
  if (tma) {
    tma.ready();
    tma.expand();
  }

  const [{ default: App }, { AppProviders }] = await Promise.all([
    import('./App'),
    import('./providers/AppProviders'),
  ]);

  const savedTheme = localStorage.getItem('ton-dapp:theme');
  document.documentElement.setAttribute(
    'data-theme',
    savedTheme === 'light' ? 'light' : 'dark',
  );

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
}

void bootstrap();
