/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TON_NETWORK?: 'mainnet' | 'testnet';
  readonly TONCENTER_MAINNET_API_KEY?: string;
  readonly TONCENTER_TESTNET_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Minimal surface of the Telegram Mini App bridge (telegram-web-app.js);
// present only when the page runs inside Telegram.
interface Window {
  Telegram?: {
    WebApp?: {
      ready(): void;
      expand(): void;
    };
  };
}
