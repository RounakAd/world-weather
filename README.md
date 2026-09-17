# 🌍 World Weather Info — Aurora Glass

An immersive, glassmorphic weather dashboard covering 50 featured cities across six continents, plus
on-demand weather for **any city on earth** via live geocoding. Every timestamp is resolved to the
city's own timezone, not the visitor's.

![React](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8) ![Vite](https://img.shields.io/badge/Vite-6-purple)

---

## ✨ What's inside

### Immersive 3D presentation
- **A real, rotating Earth.** NASA Blue Marble imagery mapped onto a sphere with a
  per-pixel orthographic renderer — day texture, a drifting cloud layer, night-side
  city lights and an atmospheric limb glow, lit by a fixed sun so the terminator
  sweeps across the surface as the planet turns. The selected city is pinned with a
  glowing marker that fades out as it rotates to the far side.
- **Live world clocks.** A large analog clock for the selected city plus ten
  reference timezones (UTC, EST, PST, CET, IST, JST, AEST, CST, MST, GMT), each with
  hour/minute/second hands and a digital AM/PM readout beneath it.
- **Five-layer parallax background** — the sky gradient, light source, star field,
  aurora blobs and drifting clouds all move at different rates against both scroll
  and pointer movement.
- **Weather-reactive ambience** — the entire palette shifts with the selected city's
  condition and day/night state, and follows the light/dark theme.
- **Real 3D glass cards** — pointer-tracked tilt with spring physics, a travelling
  specular highlight, layered rims and depth-sorted content.
- Scroll progress bar, glass header that condenses on scroll, and reveal animations
  throughout.

### Accurate, timezone-correct data
- **Local-time everything.** The hourly timeline is indexed against the API's own
  local ISO timestamps and the city's UTC offset — so a forecast for Tokyo reads in
  JST even when you are in London.
- **Real offsets on every clock.** Timezone offsets come from the browser's IANA
  database, not hardcoded constants, so daylight saving is applied automatically.
  In September the EST card correctly reads UTC−04:00 and carries a `DST` tag; the
  GMT card shows the UK's summer offset. Each clock also shows whether it is
  currently day or night locally.
- **Day/night-aware iconography.** A hand-built SVG icon set where clear skies are a
  sun by day and a moon by night, and partly-cloudy flips its celestial body after
  dusk.
- **Real readings**, not placeholders: visibility, dew point, pressure (station +
  MSL), cloud cover, UV index, wind gusts, sunrise/sunset, solar noon, daylight
  duration and a computed moon phase.
- **Two batched requests** cover all 50 cities (weather + air quality) instead of one
  hundred, with in-flight de-duplication and a 10-minute cache.

### Working city search
- Instant matches from the bundled city list, then live Open-Meteo geocoding for the rest of the world.
- Each suggestion shows the flag, region, live temperature and the city's current local time.
- Selecting a suggestion loads that city's full detail and scrolls the dashboard to it.
- Full keyboard support (`↑` `↓` `Enter` `Esc`), favourites toggling from the dropdown, and a
  "view N in grid" shortcut that filters the city grid.

### A real global map
- Genuine Natural Earth land outlines (simplified, public domain) projected equirectangularly —
  not a hand-drawn blob.
- Live temperature-coloured markers for every city, with a **computed day/night terminator** based on
  the sun's current declination and hour angle.
- Drag to pan, `+` / `−` to zoom, hover for a city card, click to load that city's forecast.

### Air quality, done properly
- A 270° radial gauge with a value marker that sits on the correct AQI band.
- The six-band US AQI scale with a live position indicator.
- Per-pollutant bars scaled relative to the worst pollutant and annotated with the share of the
  WHO 24-hour guideline, plus dominant-pollutant detection and a health summary.

### Everything that was already there, still there
50-city grid, continent filters, 7-day forecast with expandable detail, precipitation statistics,
weather trend charts, wind compass with Beaufort scale, sun/moon panel, today's outlook,
recommendations, favourites, recently viewed, °C/°F toggle and light/dark theme.

### Added for good measure
- **Live local clock** for the selected city, ticking in the header of the detail card.
- **Weather alerts** derived from live readings (extreme heat, damaging gusts, freezing conditions,
  thunderstorms, low visibility, extreme UV).
- **Activity suitability scores** for running, cycling and outdoor dining.
- **"Best time outdoors today"** — the most comfortable three-hour daylight window.
- **48-hour hourly timeline** with a temperature curve, precipitation probability and wind speed,
  toggleable between 24 h and 48 h.
- **24 h / 7 day trend toggle** across temperature, rainfall, wind and humidity.
- **City sorting** by temperature, air quality, rain chance or name.
- **Favourites & recently viewed bar** for one-tap city switching.
- Offline fallback data so the interface never renders empty.

---

## 🚀 Getting started

```bash
npm install
npm run dev      # dev server on http://localhost:5173
npm run build    # type-check + production bundle into dist/
npm run preview  # preview the production build
```

No API keys required — the app uses [Open-Meteo](https://open-meteo.com/) (forecast, air quality and
geocoding), which is free for non-commercial use.

## 🧱 Tech stack

React 18 · TypeScript · Vite 6 · Tailwind CSS 3.4 · Framer Motion · Recharts · Lucide React ·
Open-Meteo API · a hand-written canvas globe renderer

## 🗂️ Project structure

```
src/
  components/     UI — canvas Earth, analog clocks, parallax backdrop, glass primitives,
                  SVG weather icons, every panel
  context/        WeatherProvider: selection, units, theme, favourites, batched summaries
  data/           Bundled 50-city list, search helpers, generated world map paths
  hooks/          useWeather, useAirQuality, useCitySummaries, useCitySearch, useLocalClock, useNow
  services/       Open-Meteo client: parsing, timezone handling, batching, geocoding, caching
  types/          Shared domain types
  utils/          Formatting, AQI/UV/Beaufort scales, moon phase, sky palettes, timezone maths
```

### Generated and third-party assets
- `src/data/worldMap.ts` — generated from Natural Earth 110m land data (see the file header).
- `public/textures/earth-*.webp` — NASA Blue Marble imagery (day), cloud cover and night-time city
  lights, re-encoded to WebP (~290 KB total). Public domain.

## 🌐 Deployment

`vite.config.ts` derives the base path automatically: `VITE_BASE_PATH` if set, otherwise the
repository name reported by GitHub Actions (`/<repo>/` for project sites, `/` for
`<owner>.github.io` sites), otherwise `/` for local dev and custom domains. Nothing needs configuring
for GitHub Pages.

The deploy workflow fails the build if `index.html` does not reference assets under the expected
prefix — a wrong base path is otherwise a silent white screen.

---

Created by **Rounak Adhikary** · Powered by **Soumili Das**
