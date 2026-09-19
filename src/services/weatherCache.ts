/**
 * One day of weather, kept on disk.
 *
 * Open-Meteo's free tier runs out of requests part-way through the day, and when
 * it does every panel silently degrades to invented placeholder numbers. Instead
 * we keep the real thing: on the day's *first* load the 50 bundled cities are
 * fetched and written to `data/weather-cache.json` by the dev server, later loads
 * refresh just the city being looked at, and when a request fails the card is
 * rebuilt from today's saved payload rather than from placeholders.
 *
 * Only one day is ever stored — a document whose date is not today's is treated
 * as absent, and the first write of a new day replaces the file wholesale.
 *
 * Two homes, three backends: the dev server writes the file in the repo, static
 * hosting such as GitHub Pages mirrors the same JSON document into localStorage,
 * and any build that holds a GitHub token also commits the file to the repository
 * (see `githubSync`). Reads fall back across all three, so a deployed site with an
 * empty browser cache can still start the day from the committed snapshot.
 */

import { AirQualityData, City } from '../types/weather';
import { githubSync } from './githubSync';

/** One city's snapshot: the raw Open-Meteo payload, untouched. */
export interface CachedCityEntry {
  city: City;
  /** Epoch ms when the payload was captured. */
  fetchedAt: number;
  /** City-local clock label for `fetchedAt`, e.g. "1:20 PM". */
  fetchedAtLabel: string;
  /** Raw forecast payload (`current` + `hourly` + `daily`). */
  payload: unknown;
}

/** A saved air-quality reading, keyed like the city entries. */
export interface CachedReading {
  at: number;
  label: string;
  reading: AirQualityData;
}

export interface DailyCacheDoc {
  /** The visitor's local calendar day this snapshot belongs to (YYYY-MM-DD). */
  date: string;
  updatedAt: number;
  /** When the whole bundled list was last refreshed, if it has been. */
  seededAt: number | null;
  cities: Record<string, CachedCityEntry>;
  aqi: Record<string, CachedReading>;
}

const ENDPOINT = '/api/weather-cache';
const LOCAL_KEY = 'weather-daily-cache-v1';

export function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** The visitor's own calendar day — the one the file is allowed to hold. */
export function localDayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

/** Stable identity for a city, tolerant of float noise in the bundled list. */
export function cityKey(city: City): string {
  return `${city.lat.toFixed(3)},${city.lng.toFixed(3)}`;
}

export function emptyDoc(date = localDayKey()): DailyCacheDoc {
  return { date, updatedAt: Date.now(), seededAt: null, cities: {}, aqi: {} };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Accepts anything off disk/out of storage and keeps only what it can vouch for. */
export function normalizeDoc(raw: unknown): DailyCacheDoc | null {
  if (!isRecord(raw)) return null;
  const date = raw.date;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const cities: Record<string, CachedCityEntry> = {};
  if (isRecord(raw.cities)) {
    Object.entries(raw.cities).forEach(([key, entry]) => {
      if (!isRecord(entry) || !isRecord(entry.city) || entry.payload === undefined) return;
      cities[key] = {
        city: entry.city as unknown as City,
        fetchedAt: typeof entry.fetchedAt === 'number' ? entry.fetchedAt : 0,
        fetchedAtLabel: typeof entry.fetchedAtLabel === 'string' ? entry.fetchedAtLabel : '',
        payload: entry.payload,
      };
    });
  }

  const aqi: Record<string, CachedReading> = {};
  if (isRecord(raw.aqi)) {
    Object.entries(raw.aqi).forEach(([key, entry]) => {
      if (!isRecord(entry) || !isRecord(entry.reading)) return;
      aqi[key] = {
        at: typeof entry.at === 'number' ? entry.at : 0,
        label: typeof entry.label === 'string' ? entry.label : '',
        reading: entry.reading as unknown as AirQualityData,
      };
    });
  }

  return {
    date,
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : 0,
    seededAt: typeof raw.seededAt === 'number' ? raw.seededAt : null,
    cities,
    aqi,
  };
}

/* -------------------------------------------------------------------------- */
/*  Backends                                                                   */
/* -------------------------------------------------------------------------- */

/** null until we know: `false` means the endpoint is absent (static hosting). */
let endpointAvailable: boolean | null = null;

async function readFromServer(): Promise<DailyCacheDoc | null> {
  try {
    const response = await fetch(ENDPOINT, { headers: { accept: 'application/json' } });
    if (!response.ok) {
      endpointAvailable = false;
      return null;
    }
    const body = (await response.json()) as { doc?: unknown };
    endpointAvailable = true;
    return normalizeDoc(body?.doc);
  } catch {
    // No endpoint (GitHub Pages, `vite preview`) or a malformed reply.
    endpointAvailable = false;
    return null;
  }
}

async function writeToServer(doc: DailyCacheDoc): Promise<void> {
  if (endpointAvailable === false) return;
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ doc }),
    });
    endpointAvailable = response.ok;
  } catch {
    endpointAvailable = false;
  }
}

function readFromStorage(): DailyCacheDoc | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? normalizeDoc(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeToStorage(doc: DailyCacheDoc): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(doc));
  } catch {
    /* over quota — the dev-server file is still the real record */
  }
}

/* -------------------------------------------------------------------------- */
/*  Store                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * A page load touches several cities within a second or so (the selected city,
 * its air quality, then whichever panels resolve last). Re-serialising a ~1 MB
 * document five times over is pure waste, so writes are debounced into one and
 * capped so a continuously-updating page still reaches disk.
 */
const FLUSH_DEBOUNCE = 800;
const FLUSH_MAX_WAIT = 5000;

class DailyCacheStore {
  private doc: DailyCacheDoc | null = null;
  private loaded = false;
  private queue: Promise<unknown> = Promise.resolve();
  private loading: Promise<DailyCacheDoc | null> | null = null;
  /** Mutations since the last write, and how many of those are on disk. */
  private revision = 0;
  private written = 0;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private flushStartedAt = 0;
  private flushes: Promise<void> = Promise.resolve();

  /** Today's snapshot, or null when nothing has been stored for today yet. */
  async get(): Promise<DailyCacheDoc | null> {
    const doc = await this.enqueue(() => this.load());
    return doc && doc.date === localDayKey() ? doc : null;
  }

  /**
   * Opens today's document, discarding any other day's. Yesterday's entries are
   * not merely ignored — they are deleted, so the file only ever describes one
   * day even when the API is already exhausted and nothing new can be fetched.
   */
  startToday(): Promise<DailyCacheDoc> {
    return this.mutate(() => undefined);
  }

  /**
   * Applies `mutate` to today's snapshot, then writes it once the burst of
   * updates settles. A snapshot from any other day is discarded first, so the
   * file never mixes two days.
   */
  async mutate(mutate: (doc: DailyCacheDoc) => void): Promise<DailyCacheDoc> {
    const doc = await this.enqueue(async () => {
      const today = localDayKey();
      const current = await this.load();
      const next = current && current.date === today ? current : emptyDoc(today);
      mutate(next);
      next.updatedAt = Date.now();
      this.doc = next;
      this.loaded = true;
      this.revision++;
      return next;
    });
    this.scheduleFlush();
    return doc;
  }

  /** Writes whatever is current, now — used by the seed and when the page hides. */
  flush(): Promise<void> {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    this.flushStartedAt = 0;
    const doc = this.doc;
    if (!doc || this.written === this.revision) return this.flushes;
    this.written = this.revision;
    writeToStorage(doc);
    this.flushes = this.flushes
      .then(() => writeToServer(doc))
      .catch(() => undefined);
    // An empty document is not worth a commit — the seed fills it moments later.
    if (Object.keys(doc.cities).length > 0) githubSync.onSnapshotSaved(doc);
    return this.flushes;
  }

  private scheduleFlush(): void {
    const now = Date.now();
    if (this.flushTimer !== null) clearTimeout(this.flushTimer);
    else this.flushStartedAt = now;
    const cap = Math.max(0, FLUSH_MAX_WAIT - (now - this.flushStartedAt));
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, Math.min(FLUSH_DEBOUNCE, cap));
  }

  private load(): Promise<DailyCacheDoc | null> {
    if (this.loaded) return Promise.resolve(this.doc);
    if (!this.loading) {
      this.loading = (async () => {
        const server = await readFromServer();
        const local = readFromStorage();
        const today = localDayKey();
        // Today's copy wins, from the nearest source first: the dev server's
        // file, then this browser, then the repository itself — which is the only
        // thing a deployed site with a cold cache has to go on.
        const doc =
          (server?.date === today ? server : null) ??
          (local?.date === today ? local : null) ??
          (await githubSync.readRemoteSnapshot()) ??
          server ??
          local;
        this.doc = doc;
        this.loaded = true;
        return doc;
      })();
    }
    return this.loading;
  }

  /** Serialises every read/write so concurrent cards cannot clobber each other. */
  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task);
    this.queue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
}

export const dailyCache = new DailyCacheStore();

/* A background write is worthless if the page closes first; save synchronously. */
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    void dailyCache.flush();
  });
}
