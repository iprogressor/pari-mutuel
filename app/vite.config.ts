import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // the site is served from https://iprogressor.github.io/pari-mutuel/
  base: '/pari-mutuel/',
  envDir: projectRoot,
  envPrefix: ['VITE_', 'TONCENTER_'],
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@wrappers': path.resolve(projectRoot, '../wrappers-ts'),
      '@': path.resolve(projectRoot, 'src'),
      // The wrapper lives outside app/, so its `import '@ton/core'` would
      // resolve up from the repo root (absent on CI, and a *second* copy
      // locally). Pin every import to the app's single copy.
      '@ton/core': path.resolve(projectRoot, 'node_modules/@ton/core'),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/react/') || id.includes('/react-dom/'))
            return 'react';
          if (id.includes('/@ton/ton/') || id.includes('/@ton/core/'))
            return 'ton-sdk';
          if (id.includes('/@tonconnect/')) return 'tonconnect';
          return undefined;
        },
      },
    },
  },
  server: {
    fs: {
      allow: ['.', path.resolve(projectRoot, '../wrappers-ts')],
    },
    port: 5173,
  },
});
