# Running this project

React + Vite + TypeScript single-page site (`world-weather-info`). No backend, no
database — all weather data comes from the public Open-Meteo APIs.

## Artifacts a fresh checkout needs

1. **Dependencies** — `npm install` (uses `package-lock.json`; npm is the project's
   package manager, there is no yarn/pnpm/bun lockfile). `node_modules/` is the only
   generated artifact a fresh checkout must reproduce.
2. **`.env.local` — optional, and the only file with a secret in it.** Copy the
   *names* from `.env.example`; the value of `VITE_GITHUB_TOKEN` is the repository's
   sync token (see below). The file is gitignored — never commit it. Without it the
   site runs normally, it just cannot commit its snapshot to GitHub.
3. **`data/weather-cache.json` — written at runtime.** On the day's first page load
   the app fetches the 50 bundled cities and the Vite dev server writes them here
   (via the `weather-daily-cache` plugin in `vite.config.ts`, endpoint
   `GET/POST /api/weather-cache`). It holds one day: a document whose date is not
   today's is discarded, and the first write of a new day replaces the file. Static
   hosting has no endpoint, so there the same document lives in `localStorage` and
   is committed to the repository instead. Nothing needs to be copied to reproduce
   it — but note that once the file is tracked on `master`, local writes by the dev
   server show up as modifications.

## Committing the snapshot to GitHub

The day's snapshot is committed to `master` at `data/weather-cache.json` so that
*any* machine — a visitor's laptop with an empty cache, a deployed build with no dev
server — can read today's real weather back when Open-Meteo's quota is exhausted.
See `src/services/githubSync.ts`.

- **Token.** `VITE_GITHUB_TOKEN` is compiled into the bundle, so the deployed site
  can commit from the browser. Two consequences worth knowing: it must be a
  **fine-grained token scoped to this repository with `Contents: read and write`**
  and nothing else, and it must be treated as **public** — anyone who opens the site
  can read it out of the JavaScript. Rotation is `Settings → Developer settings →
  Fine-grained tokens` (editing an existing token's permissions is enough; the value
  does not change).
  - locally: `.env.local`
  - deployed: the `WEATHER_SYNC_TOKEN` repository secret, consumed by the Build step
    of `.github/workflows/deploy.yml`. Add it under *Settings → Secrets and
    variables → Actions*.
  Without a token the site skips sync entirely and never calls GitHub.
- **Branch.** `VITE_GITHUB_BRANCH` (default `master`). Commits are **appended**,
  never forced: the commit's parent is the branch tip and its tree is built with
  `base_tree`, so nothing else in the repository can be disturbed, and a race with
  another machine is retried rather than lost.
- **Cadence.** A push happens for a new day, a first push, or a larger set of cities
  (those carry information no other machine has), and otherwise at most hourly —
  `REFRESH_PUSH_MIN_GAP` in `githubSync.ts`. Identical content is never committed.
  The commit message ends with `[skip ci]` so a weather refresh does not re-run the
  Pages deploy.
- **Visibility.** There is deliberately no settings UI. The footer shows one quiet
  line (committed / not committed) and every outcome is logged to the browser
  console with a `[weather-sync]` prefix.

## Running the dev server

```bash
npm run dev            # Vite on http://localhost:5173 (config sets open: true)
```

Useful flags: `--port 5173 --strictPort` to keep the port, `--no-open` to stop Vite
opening a browser tab. **Environment changes need a restart** — `.env.local` is read
when the server starts.

Checks: `npx tsc --noEmit` (typecheck), `npm run build` (typecheck + production
bundle into `dist/`).
