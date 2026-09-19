/**
 * Publishes today's weather snapshot to the repository — from CI, not the browser.
 *
 * Run by `.github/workflows/weather-snapshot.yml` a few times a day, this script
 * fetches all bundled cities (plus their air quality) from Open-Meteo and commits
 * `data/weather-cache.json` to `master` using GitHub's own `GITHUB_TOKEN`. No
 * personal token is involved, so nothing sensitive can end up in the public
 * JavaScript bundle — that is the whole point of doing this here.
 *
 * The document it writes is exactly the shape the app already consumes (same
 * fields, same `cityKey` identity), so `savedWeather` / `normalizeDoc` in
 * `src/services/weatherCache.ts` and `weatherService.savedWeather` read it back
 * without knowing or caring who wrote it.
 *
 * Usage: node scripts/publish-weather-snapshot.mjs
 * Requires: GITHUB_REPOSITORY, GITHUB_TOKEN (both provided by Actions).
 */

import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = process.env.GITHUB_REPOSITORY; // e.g. "RounakAd/world-weather"
const TOKEN = process.env.GITHUB_TOKEN;
const BRANCH = process.env.SNAPSHOT_BRANCH || 'master';
const SNAPSHOT_PATH = 'data/weather-cache.json';
const API = 'https://api.github.com';

if (!REPO || !TOKEN) {
  console.error('This script expects GITHUB_REPOSITORY and GITHUB_TOKEN in the environment (set by Actions).');
  process.exit(1);
}

// `import.meta.url` is a file:// URL whose pathname carries a leading slash
// before the drive letter on Windows ("/C:/…"), which path.resolve would read
// as a root-less path. `fileURLToPath` is the cross-platform conversion.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* -------------------------------------------------------------------------- */
/*  The bundled city list, re-used verbatim so keys always line up.            */
/*  Duplicated on purpose: CI must not need node_modules or a bundler.         */
/* -------------------------------------------------------------------------- */

// `src/data/cities.json` is a bare array, generated from `src/data/cities.ts`.
const cities = JSON.parse(readFileSync(path.join(repoRoot, 'src/data/cities.json'), 'utf8'));

/* -------------------------------------------------------------------------- */
/*  Open-Meteo — the same field lists the app requests.                        */
/* -------------------------------------------------------------------------- */

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const BATCH_SIZE = 25;

const HOURLY_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'visibility',
  'dew_point_2m',
  'uv_index',
  'surface_pressure',
  'pressure_msl',
  'cloud_cover',
  'is_day',
].join(',');

const CURRENT_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'surface_pressure',
  'pressure_msl',
  'cloud_cover',
  'is_day',
].join(',');

const DAILY_FIELDS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'sunrise',
  'sunset',
  'daylight_duration',
  'precipitation_sum',
  'precipitation_probability_max',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'uv_index_max',
  'weather_code',
].join(',');

const AIR_FIELDS = 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide';

/** Mirrors `cityKey` in src/services/weatherCache.ts. */
function cityKey(city) {
  return `${city.lat.toFixed(3)},${city.lng.toFixed(3)}`;
}

/** Mirrors `localClock(...).time` (24h "HH:MM" form is stored as a 12h label). */
function cityLocalTimeLabel(utcOffsetSeconds, at = new Date()) {
  const local = new Date(at.getTime() + utcOffsetSeconds * 1000);
  let hours = local.getUTCHours();
  const minutes = local.getUTCMinutes().toString().padStart(2, '0');
  const suffix = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status} for ${url.split('?')[0]}`);
  return response.json();
}

function chunk(list, size) {
  const out = [];
  for (let index = 0; index < list.length; index += size) out.push(list.slice(index, index + size));
  return out;
}

/** The app requests 7 forecast days + 1 past day; the snapshot matches that. */
async function fetchWeatherPayload(batch) {
  const params = new URLSearchParams({
    latitude: batch.map((city) => city.lat).join(','),
    longitude: batch.map((city) => city.lng).join(','),
    current: CURRENT_FIELDS,
    hourly: HOURLY_FIELDS,
    daily: DAILY_FIELDS,
    timezone: 'auto',
    forecast_days: '7',
    past_days: '1',
    wind_speed_unit: 'kmh',
  });
  return fetchJson(`${FORECAST_URL}?${params}`);
}

async function fetchAirPayload(batch) {
  const params = new URLSearchParams({
    latitude: batch.map((city) => city.lat).join(','),
    longitude: batch.map((city) => city.lng).join(','),
    current: AIR_FIELDS,
  });
  return fetchJson(`${AIR_URL}?${params}`);
}

/* -------------------------------------------------------------------------- */
/*  Build today's document                                                     */
/* -------------------------------------------------------------------------- */

const todayKey = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})();

console.log(`Fetching ${cities.length} cities from Open-Meteo for ${todayKey}…`);

const doc = { date: todayKey, updatedAt: 0, seededAt: null, cities: {}, aqi: {} };
const batches = chunk(cities, BATCH_SIZE);
const weatherRows = (await Promise.all(batches.map(fetchWeatherPayload))).flat();

// A batched request answers with an array row per coordinate, in request order.
weatherRows.forEach((row, index) => {
  const city = cities[index];
  if (!city || !row?.current) return;
  doc.cities[cityKey(city)] = {
    city,
    payload: row,
    fetchedAt: Date.now(),
    fetchedAtLabel: cityLocalTimeLabel(row.utc_offset_seconds ?? 0),
  };
});

const airRows = (await Promise.all(batches.map(fetchAirPayload))).flat();
airRows.forEach((row, index) => {
  const city = cities[index];
  if (!city || !row?.current) return;
  doc.aqi[cityKey(city)] = {
    at: Date.now(),
    label: cityLocalTimeLabel(0),
    reading: {
      aqi: Math.round(row.current.us_aqi ?? 0),
      pm25: Math.round((row.current.pm2_5 ?? 0) * 10) / 10,
      pm10: Math.round(row.current.pm10 ?? 0),
      no2: Math.round((row.current.nitrogen_dioxide ?? 0) * 10) / 10,
      o3: Math.round((row.current.ozone ?? 0) * 10) / 10,
      so2: Math.round((row.current.sulphur_dioxide ?? 0) * 10) / 10,
      co: Math.round(row.current.carbon_monoxide ?? 0),
      // The app recomputes category / scale / dominant pollutant from these
      // numbers on read; the stored document keeps only the raw values it needs.
    },
  };
});

doc.seededAt = Date.now();
doc.updatedAt = Date.now();

const fetched = Object.keys(doc.cities).length;
const withAir = Object.keys(doc.aqi).length;
if (fetched === 0) {
  console.error('Open-Meteo returned no usable data — refusing to publish an empty snapshot.');
  process.exit(1);
}
console.log(`Fetched ${fetched} cities (${withAir} with air quality).`);
if (fetched < cities.length) {
  console.warn(`${cities.length - fetched} cities are missing from the response; publishing what arrived.`);
}

/* -------------------------------------------------------------------------- */
/*  Commit to GitHub — the same git-data API the browser used to call.         */
/* -------------------------------------------------------------------------- */

const headers = {
  accept: 'application/vnd.github+json',
  'x-github-api-version': '2022-11-28',
  authorization: `Bearer ${TOKEN}`,
  'content-type': 'application/json',
  'user-agent': 'weather-snapshot-action',
};

async function api(method, requestPath, body) {
  const response = await fetch(`${API}/repos/${REPO}${requestPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${requestPath} → ${response.status}: ${text.slice(0, 300)}`);
  return data;
}

const branch = await api('GET', `/branches/${BRANCH}`);
const headSha = branch.commit.sha;
const baseTree = branch.commit.commit.tree.sha;

const content = JSON.stringify(doc);
const blob = await api('POST', '/git/blobs', { content, encoding: 'utf-8' });
const tree = await api('POST', '/git/trees', {
  base_tree: baseTree,
  tree: [{ path: SNAPSHOT_PATH, mode: '100644', type: 'blob', sha: blob.sha }],
});
const commit = await api('POST', '/git/commits', {
  message: `Weather snapshot for ${doc.date} (${fetched} cities) [skip ci]`,
  tree: tree.sha,
  parents: [headSha],
});
await api('PATCH', `/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });

console.log(`Committed ${fetched} cities to ${BRANCH} as ${commit.sha.slice(0, 7)} (parent ${headSha.slice(0, 7)}).`);

/* -------------------------------------------------------------------------- */
/*  Also write the file into the checkout, for the optional artifact step.     */
/* -------------------------------------------------------------------------- */

mkdirSync(path.dirname(path.join(repoRoot, SNAPSHOT_PATH)), { recursive: true });
writeFileSync(path.join(repoRoot, SNAPSHOT_PATH), content, 'utf8');
rmSync(`${path.join(repoRoot, SNAPSHOT_PATH)}.tmp`, { force: true });
