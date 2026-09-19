# Running this project

React + Vite + TypeScript single-page site (`world-weather-info`). No backend, no
database — all weather data comes from the public Open-Meteo APIs.

## Artifacts a fresh checkout needs

1. **Dependencies** — `npm install` (uses `package-lock.json`; npm is the project's
   package manager, there is no yarn/pnpm/bun lockfile).
2. **No environment files.** There is no `.env`, no `.env.local` and no secrets —
   the scheduled snapshot Action uses GitHub's own `GITHUB_TOKEN`. `VITE_BASE_PATH` /
   `GITHUB_REPOSITORY` are optional and only used when building for GitHub Pages.
3. **`data/weather-cache.json` — generated, never hand-edited.** It holds one day of
   real weather for all bundled cities and is committed to `master` by the scheduled
   Action (`.github/workflows/weather-snapshot.yml`, script
   `scripts/publish-weather-snapshot.mjs`). During development the Vite dev server
   also writes it locally (the `weather-daily-cache` plugin in `vite.config.ts`,
   endpoint `GET/POST /api/weather-cache`) so a dev session records the cities it
   actually viewed. It is gitignored, so local writes never show up as changes.

## How the snapshot reaches the site

- **Writing** happens only in CI: the workflow runs at 00:30 / 06:30 / 12:30 UTC
  (and on demand via *Run workflow*), fetches all 50 cities plus air quality from
  Open-Meteo, and appends one commit to `master` —
  `Weather snapshot for YYYY-MM-DD (50 cities) [skip ci]`. `[skip ci]` keeps the
  Pages deploy from re-running. The commit is parented on the current tip and the
  tree is built with `base_tree`, so nothing else in the repository can change.
- **Reading** happens in the browser with no credentials at all: the app pulls
  today's document from `raw.githubusercontent.com` (public repo, CORS enabled,
  minute-level cache-buster), falling back to the dev-server endpoint and
  `localStorage`. When Open-Meteo's free quota runs out later in the day, the cards
  are rebuilt from this saved snapshot (`dataSource: 'cache'`, surfaced in the
  banner) instead of placeholder numbers.
- To regenerate the snapshot manually: `node scripts/publish-weather-snapshot.mjs`
  with `GITHUB_REPOSITORY` + `GITHUB_TOKEN` in the environment (on GitHub, or with
  any token that has Contents write on the repo). Locally it also refreshes the
  working-tree file.

Checks: `npx tsc --noEmit` (typecheck), `npm run build` (typecheck + production
bundle into `dist/`), and `node scripts/publish-weather-snapshot.mjs` (the CI job).
