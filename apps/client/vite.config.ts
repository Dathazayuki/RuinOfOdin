import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()] as any,
  server: { port: 5173, strictPort: true, host: true, allowedHosts: true },
  preview: { port: 4173, host: true, allowedHosts: true },
  build: { chunkSizeWarningLimit: 650 },
});
