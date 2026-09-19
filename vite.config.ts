import { promises as fs } from 'node:fs';
import path from 'node:path';
import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Weather cache endpoint.
 *
 * The browser cannot write files, so the dev server does it: `GET` hands back
 * today's snapshot and `POST` replaces it. When the Open-Meteo quota is spent
 * later in the day the app rebuilds its cards from this file instead of showing
 * invented numbers. The file lives in the repo (`data/weather-cache.json`) and
 * holds a single day — see `src/services/weatherCache.ts`.
 */
const CACHE_FILE = path.resolve(process.cwd(), 'data/weather-cache.json');
const MAX_BODY = 12 * 1024 * 1024;

function weatherCachePlugin(): Plugin {
  const handler = (req: any, res: any) => {
    const send = (status: number, body: unknown) => {
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.setHeader('cache-control', 'no-store');
      res.end(JSON.stringify(body));
    };

    if (req.method === 'GET') {
      fs.readFile(CACHE_FILE, 'utf8')
        .then((raw) => {
          const doc = JSON.parse(raw);
          console.log(`[weather-cache] read ${Object.keys(doc.cities ?? {}).length} cities for ${doc.date}`);
          send(200, { doc });
        })
        // Missing or unreadable file is normal on a fresh checkout.
        .catch(() => send(200, { doc: null }));
      return;
    }

    if (req.method !== 'POST') {
      send(405, { error: 'method not allowed' });
      return;
    }

    let body = '';
    let aborted = false;
    req.on('data', (chunk: Buffer) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        aborted = true;
        send(413, { error: 'payload too large' });
        req.destroy();
      }
    });
    req.on('error', () => {
      if (!aborted) send(500, { error: 'request failed' });
    });
    req.on('end', () => {
      if (aborted) return;
      let doc: any;
      try {
        doc = JSON.parse(body)?.doc;
      } catch {
        send(400, { error: 'invalid json' });
        return;
      }
      if (!doc || typeof doc !== 'object' || typeof doc.date !== 'string') {
        send(400, { error: 'expected { doc: { date, cities } }' });
        return;
      }
      const serialized = JSON.stringify(doc);
      fs.mkdir(path.dirname(CACHE_FILE), { recursive: true })
        .then(() => fs.writeFile(`${CACHE_FILE}.tmp`, serialized, 'utf8'))
        // Rename is atomic; the fallback covers filesystems that refuse to replace.
        .then(() => fs.rename(`${CACHE_FILE}.tmp`, CACHE_FILE).catch(() => fs.writeFile(CACHE_FILE, serialized, 'utf8')))
        .then(() => {
          const count = Object.keys(doc.cities ?? {}).length;
          console.log(`[weather-cache] saved ${count} cities for ${doc.date} (${(serialized.length / 1024).toFixed(0)} kB)`);
          send(200, { ok: true, count });
        })
        .catch((error: unknown) => {
          console.error('[weather-cache] write failed:', error);
          send(500, { error: 'write failed' });
        });
    });
  };

  return {
    name: 'weather-daily-cache',
    configureServer(server) {
      server.middlewares.use('/api/weather-cache', handler);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/weather-cache', handler);
    },
  };
}

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
  plugins: [react(), weatherCachePlugin()],
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
