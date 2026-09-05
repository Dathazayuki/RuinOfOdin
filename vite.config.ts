import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['core-battleclient-production.up.railway.app', '.up.railway.app', 'localhost', '127.0.0.1'],
  },
  preview: {
    allowedHosts: ['core-battleclient-production.up.railway.app', '.up.railway.app', 'localhost', '127.0.0.1'],
  },
});
