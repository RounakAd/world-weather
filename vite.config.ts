import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: set base to '/<REPO_NAME>/' in production.
  // Change 'website' to your actual repository name.
  base: process.env.NODE_ENV === 'production' ? '/website/' : '/',
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
