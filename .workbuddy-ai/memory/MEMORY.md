# World Weather Info — project notes

React 18 + TypeScript + Vite 6 + Tailwind 3.4 + Framer Motion + Recharts.
Data: Open-Meteo (forecast, air quality, geocoding) — no API key needed.

## Conventions

- **All displayed times are the selected city's local time.** Never use
  `new Date().getHours()` for anything city-specific. Open-Meteo `timezone=auto`
  returns offset-less local ISO strings plus `utc_offset_seconds`; locate "now" by
  matching the API's `current.time` prefix against `hourly.time[]`, and format
  labels by parsing those strings. `localClock(offsetSeconds)` in `utils/helpers`
  is the one place that converts an offset into a wall clock.
- **Icons are resolved from `(condition, isDay)`**, never from the condition alone.
  `iconKindFor()` in `services/weatherService.ts` is the single source of truth;
  `components/WeatherIcon.tsx` renders the SVG set.
- **Batching over per-item requests.** `getCitySummaries()` and
  `getAirQualityBatch()` chunk 25 coordinates per request. The shared
  `Map<string, CitySummary>` comes from `WeatherContext`, not per-card hooks.
- **Glass surfaces use the CSS custom properties** in `src/index.css`
  (`--glass-bg`, `--glass-border`, `--glass-shadow`, `--ink-soft`). Prefer the
  `.glass` / `.glass-inset` / `.glass-interactive` classes over ad-hoc utility
  combinations so both themes stay in sync.
- **The ambient background must receive the theme.** `skyPalette(condition, isDay,
  theme)` branches on `theme` first — day/night is a secondary nuance.
- **Preference state is hydrated in `useState` initialisers**, never in an effect,
  because StrictMode's double-invoked effects clobber values written by sibling
  effects. `index.html` also sets the theme class pre-paint.
- Charts that mix series types use `ComposedChart`. Chart grid/tick colours come
  from CSS rules on `.recharts-*` classes (SVG presentation attributes ignore
  `var()`).
- `src/data/worldMap.ts` is **generated** — regenerate with the
  `react-glass-dashboard` skill's `scripts/build_world_map.py` rather than editing.

## Deliberate design decisions

- `base` defaults to `/`; set `VITE_BASE_PATH=/<repo>/` for GitHub Pages project sites.
- The light-theme ambient palette is a soft dawn gradient; the dark palette is
  midnight blue. Both were tuned against screenshots, not guessed.
- The global map is inline SVG rather than a mapping library — it keeps the bundle
  small and the styling consistent with the glass language.
- Offline fallback data exists so panels never render empty; it is clearly derived
  from a city-name hash, not presented as real data.
