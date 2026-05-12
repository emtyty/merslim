import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use relative asset URLs so `npm run build` produces a `dist/` you can
  // open directly via `file://` without a web server.
  base: './',
  server: { open: true },
});
