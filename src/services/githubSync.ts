/**
 * Committing the day's weather snapshot to GitHub.
 *
 * Open-Meteo's free quota runs out part-way through the day, and a deployed site
 * has no server that could write a file. So the page itself commits the snapshot
 * to the repository: any visitor's browser — on any machine — can then read it
 * back when the API is exhausted and show the day's real weather instead of
 * invented placeholders.
 *
 * ## The token
 *
 * Committing needs write access, so the token is compiled into the bundle at
 * build time from `VITE_GITHUB_TOKEN` (locally `.env.local`, in the deploy
 * workflow the `WEATHER_SYNC_TOKEN` repository secret). That means the token is
 * **public**: anyone who opens the site can read it out of the JavaScript. Treat
 * it accordingly and scope it to this one repository with `Contents: read and
 * write` and nothing else, so the worst case is a corrupted weather file rather
 * than a corrupted account. `localStorage` can still override it at runtime
 * (useful for testing another repository), and a build with no token at all
 * simply never contacts GitHub.
 *
 * ## What gets written
 *
 * `data/weather-cache.json` on `master`, as an ordinary append-only commit whose
 * parent is the branch's current tip, whose tree is the branch's existing tree
 * with that one file replaced, and whose message carries `[skip ci]` so a weather
 * refresh does not re-run the Pages deploy. Pushes are rare by design: a new day,
 * a growing set of cities, or an hour since the last push — and never at all when
 * the committed file is already identical.
 */

import type { DailyCacheDoc } from './weatherCache';

const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';

/** This project's repository; overridable via env or the setter below. */
export const DEFAULT_REPO = 'RounakAd/world-weather';
export const DEFAULT_BRANCH = 'master';
export const SNAPSHOT_PATH = 'data/weather-cache.json';

const STORAGE = {
  token: 'weather-github-token',
  repo: 'weather-github-repo',
  branch: 'weather-github-branch',
  lastPushAt: 'weather-sync-last-push',
  lastPushDate: 'weather-sync-last-date',
  lastPushCities: 'weather-sync-last-cities',
};

/** Let a burst of snapshot writes (seed + the cities being viewed) settle. */
const PUSH_DEBOUNCE = 4000;

/**
 * Refresh pushes (new readings for cities already committed) wait at least this
 * long. A new day, a first push, or a larger set of cities bypasses the wait —
 * those carry information another machine cannot already have. Without this,
 * every page load would append a ~1 MB commit to `master`.
 */
const REFRESH_PUSH_MIN_GAP = 60 * 60 * 1000;

export interface GitHubSyncConfig {
  token: string;
  repo: string;
  branch: string;
}

export type SyncState = 'off' | 'pending' | 'syncing' | 'synced' | 'unchanged' | 'error';

export interface SyncStatus {
  state: SyncState;
  message: string;
  /** Epoch ms of the last successful push. */
  at: number | null;
  /** Commit sha of the last successful push. */
  sha: string | null;
  /** Why the last push happened, e.g. "first of 2026-09-19". */
  reason: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Configuration                                                              */
/* -------------------------------------------------------------------------- */

/** Build-time environment, or an empty object outside a Vite build. */
function buildEnv(): Record<string, string | undefined> {
  try {
    return (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  } catch {
    return {};
  }
}

function readSetting(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeSetting(key: string, value: string): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage disabled — sync still works, it just cannot remember its cadence */
  }
}

/**
 * The repository this deployment belongs to: a GitHub Pages project site is
 * served from `/<owner>.github.io>/<project>/`, so the answer is in the URL.
 * Local development falls back to the project's own repository.
 */
export function detectRepo(): string {
  try {
    const { hostname, pathname } = window.location;
    const [project] = pathname.split('/').filter(Boolean);
    if (hostname.endsWith('.github.io') && project) return `${hostname.replace('.github.io', '')}/${project}`;
    return DEFAULT_REPO;
  } catch {
    return DEFAULT_REPO;
  }
}

export function readConfig(): GitHubSyncConfig {
  const env = buildEnv();
  return {
    token: (env.VITE_GITHUB_TOKEN ?? readSetting(STORAGE.token)).trim(),
    repo: (env.VITE_GITHUB_REPO ?? (readSetting(STORAGE.repo) || detectRepo())).trim(),
    branch: (env.VITE_GITHUB_BRANCH ?? (readSetting(STORAGE.branch) || DEFAULT_BRANCH)).trim(),
  };
}

/** Runtime override, used by tests and by a custom deployment. */
export function saveConfig(next: Partial<GitHubSyncConfig>): GitHubSyncConfig {
  if (next.token !== undefined) writeSetting(STORAGE.token, next.token.trim());
  if (next.repo !== undefined) writeSetting(STORAGE.repo, next.repo.trim());
  if (next.branch !== undefined) writeSetting(STORAGE.branch, next.branch.trim());
  return readConfig();
}

export function hasToken(): boolean {
  return readConfig().token.length > 0;
}

/* -------------------------------------------------------------------------- */
/*  Status                                                                     */
/* -------------------------------------------------------------------------- */

let status: SyncStatus = { state: 'off', message: 'Not configured', at: null, sha: null, reason: null };
const listeners = new Set<(status: SyncStatus) => void>();

export function getStatus(): SyncStatus {
  return status;
}

export function subscribe(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  // Seed the new subscriber with the current value, so a late mount is not blank.
  listener(status);
  return () => listeners.delete(listener);
}

function setStatus(next: Partial<SyncStatus> & { state: SyncState; message: string }): void {
  status = { ...status, ...next };
  listeners.forEach((listener) => listener(status));
  // No UI for this, so the console is where a suspected sync problem is visible.
  const quiet = status.state === 'synced' || status.state === 'unchanged';
  const line = `[weather-sync] ${status.state}: ${status.message}`;
  if (quiet) console.info(line);
  else if (status.state === 'off') console.info(line);
  else console.warn(line);
}

/* -------------------------------------------------------------------------- */
/*  API                                                                        */
/* -------------------------------------------------------------------------- */

interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
}

async function request<T>(cfg: GitHubSyncConfig, method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': API_VERSION,
        ...(cfg.token ? { authorization: `Bearer ${cfg.token}` } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(`Could not reach api.github.com (${(error as Error).message})`);
  }
  if (response.status === 204) return { ok: true, status: 204, data: null };
  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  return { ok: response.ok, status: response.status, data: data as T | null };
}

/** GitHub's error bodies all carry a `message`; successful ones do not. */
function errorDetail(data: unknown): string {
  const message = (data as { message?: unknown } | null)?.message;
  return typeof message === 'string' && message ? ` — ${message}` : '';
}

/** Turns GitHub's status codes into something actionable. */
function describeFailure(result: { status: number; data: unknown }, doing: string): string {
  const detail = errorDetail(result.data);
  switch (result.status) {
    case 401:
      return 'Token rejected (401): it is invalid or has expired.';
    case 403:
      return 'Token lacks permission (403): it needs Contents read & write on this repository.';
    case 404:
      return `Not found (404) while ${doing}: check the repository and that the token can see it.`;
    case 409:
    case 422:
      return `Rejected (${result.status}) while ${doing}${detail}`;
    case 429:
      return 'Rate limited (429): too many pushes — waiting helps.';
    default:
      return `GitHub said ${result.status} while ${doing}${detail}`;
  }
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

/**
 * What a snapshot is *made of*: the day, the cities and their capture times.
 * `updatedAt` is excluded — it moves on every write, including ones that change
 * nothing (opening the day's document, for instance), and a commit that changes
 * no data is noise.
 */
export function canonicalSnapshot(doc: DailyCacheDoc): string {
  const cities: Record<string, unknown> = {};
  Object.keys(doc.cities)
    .sort()
    .forEach((key) => {
      const entry = doc.cities[key];
      cities[key] = {
        fetchedAt: entry.fetchedAt,
        fetchedAtLabel: entry.fetchedAtLabel,
        city: entry.city,
        payload: entry.payload,
      };
    });
  const aqi: Record<string, unknown> = {};
  Object.keys(doc.aqi)
    .sort()
    .forEach((key) => {
      aqi[key] = doc.aqi[key];
    });
  return JSON.stringify({ date: doc.date, seededAt: doc.seededAt, cities, aqi });
}

interface ContentsResponse {
  sha: string;
  content: string;
  encoding: string;
}

/** The snapshot currently committed on the branch, if there is one. */
async function fetchRemoteSnapshot(
  cfg: GitHubSyncConfig,
): Promise<{ sha: string; text: string; doc: DailyCacheDoc | null } | null> {
  const result = await request<ContentsResponse>(
    cfg,
    'GET',
    `/repos/${cfg.repo}/contents/${SNAPSHOT_PATH}?ref=${encodeURIComponent(cfg.branch)}`,
  );
  if (!result.ok || !result.data?.content) return null;
  try {
    const text = decodeBase64Utf8(result.data.content);
    return { sha: result.data.sha, text, doc: JSON.parse(text) as DailyCacheDoc };
  } catch {
    return null;
  }
}

/**
 * Reads today's snapshot straight out of the repository. Public repositories need
 * no token, which is what lets a deployed site — no dev server, empty browser
 * cache, any machine — start the day with real numbers instead of placeholders.
 */
export async function readRemoteSnapshot(): Promise<DailyCacheDoc | null> {
  const cfg = readConfig();
  if (!cfg.repo) return null;
  try {
    return (await fetchRemoteSnapshot(cfg))?.doc ?? null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/*  Pushing                                                                    */
/* -------------------------------------------------------------------------- */

interface BranchResponse {
  commit?: { sha?: string; commit?: { tree?: { sha?: string } } };
}
interface BlobResponse {
  sha: string;
}
interface TreeResponse {
  sha: string;
}
interface CommitResponse {
  sha: string;
}

let inFlight: Promise<SyncStatus> | null = null;
let queued: DailyCacheDoc | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Appends one commit to `branch` that replaces `SNAPSHOT_PATH` with `doc`.
 *
 * The commit's parent is the branch's current tip and its tree is the branch's
 * existing tree with a single file swapped in, so unrelated files are untouched
 * and nothing is ever force-pushed — a race simply loses and retries against the
 * newer tip.
 */
export async function pushSnapshot(doc: DailyCacheDoc, options: { force?: boolean; reason?: string } = {}): Promise<SyncStatus> {
  const cfg = readConfig();
  if (!cfg.token || !cfg.repo) {
    setStatus({ state: 'off', message: 'No token configured — the snapshot stays local.', reason: null });
    return status;
  }

  if (inFlight) {
    queued = doc;
    return inFlight;
  }

  const reason = options.reason ?? 'manual push';
  setStatus({ state: 'syncing', message: `Pushing to ${cfg.repo}@${cfg.branch}…`, reason });
  inFlight = (async () => {
    try {
      // Two attempts: the branch may move under us between reading and writing.
      for (let attempt = 0; attempt < 2; attempt++) {
        const remote = await fetchRemoteSnapshot(cfg);
        if (!options.force && remote?.doc && canonicalSnapshot(remote.doc) === canonicalSnapshot(doc)) {
          setStatus({
            state: 'unchanged',
            message: `${cfg.branch} already has this snapshot`,
            at: status.at,
            sha: status.sha,
            reason,
          });
          return status;
        }

        const branch = await request<BranchResponse>(cfg, 'GET', `/repos/${cfg.repo}/branches/${encodeURIComponent(cfg.branch)}`);
        // A missing branch is fine: the first push creates it.
        const headSha = branch.ok ? (branch.data?.commit?.sha ?? null) : null;
        const baseTree = branch.ok ? (branch.data?.commit?.commit?.tree?.sha ?? null) : null;

        const count = Object.keys(doc.cities).length;
        const blob = await request<BlobResponse>(cfg, 'POST', `/repos/${cfg.repo}/git/blobs`, {
          content: JSON.stringify(doc),
          encoding: 'utf-8',
        });
        if (!blob.ok || !blob.data?.sha) {
          setStatus({ state: 'error', message: describeFailure(blob, 'uploading the snapshot'), reason });
          return status;
        }

        const tree = await request<TreeResponse>(cfg, 'POST', `/repos/${cfg.repo}/git/trees`, {
          // `base_tree` is what keeps the rest of the repository intact: without
          // it the new tree would contain only this file, and committing that
          // would delete everything else on the branch.
          ...(baseTree ? { base_tree: baseTree } : {}),
          tree: [{ path: SNAPSHOT_PATH, mode: '100644', type: 'blob', sha: blob.data.sha }],
        });
        if (!tree.ok || !tree.data?.sha) {
          setStatus({ state: 'error', message: describeFailure(tree, 'building the tree'), reason });
          return status;
        }

        const commit = await request<CommitResponse>(cfg, 'POST', `/repos/${cfg.repo}/git/commits`, {
          // `[skip ci]` keeps a weather refresh from re-running the Pages deploy.
          message: `Weather snapshot for ${doc.date} (${count} cities) [skip ci]`,
          tree: tree.data.sha,
          parents: headSha ? [headSha] : [],
        });
        if (!commit.ok || !commit.data?.sha) {
          setStatus({ state: 'error', message: describeFailure(commit, 'creating the commit'), reason });
          return status;
        }

        const move = headSha
          ? await request(cfg, 'PATCH', `/repos/${cfg.repo}/git/refs/heads/${encodeURIComponent(cfg.branch)}`, {
              sha: commit.data.sha,
              // Never forced: on `master` a force-push would discard commits.
              force: false,
            })
          : await request(cfg, 'POST', `/repos/${cfg.repo}/git/refs`, {
              ref: `refs/heads/${cfg.branch}`,
              sha: commit.data.sha,
            });

        if (move.ok) {
          writeSetting(STORAGE.lastPushAt, String(Date.now()));
          writeSetting(STORAGE.lastPushDate, doc.date);
          writeSetting(STORAGE.lastPushCities, String(count));
          setStatus({
            state: 'synced',
            message: `Committed ${count} cities to ${cfg.branch} (${reason})`,
            at: Date.now(),
            sha: commit.data.sha.slice(0, 7),
            reason,
          });
          return status;
        }

        const raced = move.status === 409 || move.status === 422;
        if (!raced || attempt === 1) {
          setStatus({ state: 'error', message: describeFailure(move, `updating ${cfg.branch}`), reason });
          return status;
        }
        console.info('[weather-sync] branch moved while pushing — retrying against the newer tip');
      }
      return status;
    } catch (error) {
      setStatus({ state: 'error', message: (error as Error).message, reason });
      return status;
    } finally {
      inFlight = null;
      if (queued) {
        const next = queued;
        queued = null;
        void pushSnapshot(next);
      }
    }
  })();

  return inFlight;
}

/**
 * Why this snapshot is worth a commit — or null when it is not.
 *
 * `master` accumulates history, so the default is restraint: push when the
 * information could not already exist on the other side (a new day, a first push,
 * cities another machine has not seen), otherwise at most hourly. Identical data
 * never reaches GitHub at all, because the comparison above catches it.
 */
function pushReason(doc: DailyCacheDoc): string | null {
  const lastAt = Number(readSetting(STORAGE.lastPushAt)) || 0;
  const lastDate = readSetting(STORAGE.lastPushDate);
  const lastCities = Number(readSetting(STORAGE.lastPushCities)) || 0;
  const cities = Object.keys(doc.cities).length;

  if (!lastAt) return 'first push from this browser';
  if (lastDate !== doc.date) return `first snapshot of ${doc.date}`;
  if (cities > lastCities) return `${cities - lastCities} more cities`;
  if (Date.now() - lastAt >= REFRESH_PUSH_MIN_GAP) return 'hourly refresh';
  return null;
}

/**
 * Called whenever the local snapshot is written. Bursts (the 50-city seed plus
 * whichever cities were viewed) collapse into one push.
 */
export function onSnapshotSaved(doc: DailyCacheDoc): void {
  if (!hasToken()) return;
  if (pushTimer !== null) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    const reason = pushReason(doc);
    if (!reason) {
      setStatus({
        state: 'unchanged',
        message: `Nothing to add — ${Object.keys(doc.cities).length} cities already committed (next refresh within the hour)`,
        at: null,
        reason: null,
      });
      return;
    }
    setStatus({ state: 'pending', message: `Snapshot changed (${reason}) — pushing…`, reason });
    void pushSnapshot(doc, { reason });
  }, PUSH_DEBOUNCE);
}

export const githubSync = {
  readConfig,
  saveConfig,
  hasToken,
  detectRepo,
  getStatus,
  subscribe,
  pushSnapshot,
  onSnapshotSaved,
  readRemoteSnapshot,
  canonicalSnapshot,
};
