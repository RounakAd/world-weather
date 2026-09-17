import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Resolve the public base path the bundle is served from.
 *
 * GitHub Pages serves *project* sites from `/<repo>/`, so a build with the
 * default base of `/` loads index.html but 404s every `/assets/*` request —
 * the page renders blank. Rather than hardcoding a repo name (which silently
 * breaks if the repo is renamed), derive it:
 *
 *   1. `VITE_BASE_PATH` — explicit override, always wins.
 *   2. `GITHUB_REPOSITORY` — set automatically by GitHub Actions
 *      (`owner/repo`). User/org sites (`<owner>.github.io`) are served from the
 *      domain root, everything else from `/<repo>/`.
 *   3. `/` — local dev, `vite preview` and custom domains.
 */
function resolveBasePath(): string {
  const explicit = process.env.VITE_BASE_PATH?.trim();
  if (explicit) return explicit.endsWith('/') ? explicit : `${explicit}/`;

  const repo = process.env.GITHUB_REPOSITORY?.split('/')[1]?.trim();
  if (repo) {
    return repo.endsWith('.github.io') ? '/' : `/${repo}/`;
  }

  return '/';
}

const base = resolveBasePath();

// Surfaced in the Actions log so a misconfigured deploy is obvious at a glance.
if (process.env.GITHUB_ACTIONS) {
  console.log(`[vite] building for GitHub Pages with base "${base}"`);
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base,
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
