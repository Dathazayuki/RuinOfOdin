import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()] as any,
  server: {
    port: 5173,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: ['core-battleclient-production.up.railway.app', '.up.railway.app', 'localhost', '127.0.0.1'],
    hmr: {
      host: 'core-battleclient-production.up.railway.app',
      protocol: 'wss',
      clientPort: 443,
    },
  },
  preview: {
    port: 4173,
    host: '0.0.0.0',
    allowedHosts: ['core-battleclient-production.up.railway.app', '.up.railway.app', 'localhost', '127.0.0.1'],
  },
  build: { chunkSizeWarningLimit: 650 },
});
