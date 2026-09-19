import {
  AirQualityData,
  City,
  CitySummary,
  DayForecast,
  HourlyForecast,
  RainEta,
  RainOutlook,
  RainSlot,
  WeatherCondition,
  WeatherData,
  WeatherIconKind,
} from '../types/weather';
import { continentFromCoordinates } from '../data/cities';
import {
  buildRainOutlook,
  chunk,
  computeDewPoint,
  computeHeatIndex,
  computeWindChill,
  daysBetweenIso,
  formatClockFromIso,
  formatDuration,
  formatHourLabel,
  dayLabelFromIso,
  getAQICategory,
  getAQIScale,
  getDominantPollutant,
  getMoonPhase,
  getWindDirectionText,
  isRainHour,
  localClock,
  minutesFromIso,
  shortDateFromIso,
} from '../utils/helpers';
import { zoneOffsetMinutes } from '../utils/timezones';
import { cityKey, dailyCache } from './weatherCache';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const HOURLY_WINDOW = 48; // hours of hourly forecast exposed to the UI
const BATCH_SIZE = 25; // coordinates per batched request
/** Cities snapshotted to the daily file on the day's first load. */
const DAILY_SEED_CITIES = 50;

/* -------------------------------------------------------------------------- */
/*  API response shapes                                                       */
/* -------------------------------------------------------------------------- */

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  timezone_abbreviation: string;
  utc_offset_seconds: number;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    surface_pressure: number;
    pressure_msl: number;
    cloud_cover: number;
    is_day: number;
    /** Only requested by the lightweight batch endpoint. */
    precipitation_probability?: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    apparent_temperature: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    visibility: number[];
    dew_point_2m: number[];
    uv_index: number[];
    surface_pressure: number[];
    pressure_msl: number[];
    cloud_cover: number[];
    is_day: number[];
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    daylight_duration: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    uv_index_max: number[];
    weather_code: number[];
  };
}

interface OpenMeteoAQIResponse {
  current: {
    time: string;
    us_aqi: number;
    pm2_5: number;
    pm10: number;
    nitrogen_dioxide: number;
    ozone: number;
    sulphur_dioxide: number;
    carbon_monoxide: number;
  };
}

interface GeocodeResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  country_code?: string;
  admin1?: string;
  timezone?: string;
  population?: number;
  feature_code?: string;
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

/* -------------------------------------------------------------------------- */
/*  Weather code tables                                                       */
/* -------------------------------------------------------------------------- */

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
  // Cloud cover and MSL pressure are not in the `current` block of a saved
  // payload, so the hourly series carries them for the cached path.
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

/** WMO weather code → human condition, resolved for day / night. */
function wmoToCondition(code: number, isDay: boolean): WeatherCondition {
  switch (true) {
    case code === 0:
    case code === 1:
      return isDay ? 'Sunny' : 'Clear';
    case code === 2:
      return 'Partly Cloudy';
    case code === 3:
      return 'Overcast';
    case code === 45:
    case code === 48:
      return 'Fog';
    case code >= 51 && code <= 57:
      return 'Drizzle';
    case code === 61:
    case code === 80:
      return 'Light Rain';
    case code === 63:
    case code === 66:
    case code === 67:
    case code === 81:
      return 'Rain';
    case code === 65:
    case code === 82:
      return 'Heavy Rain';
    case code >= 71 && code <= 77:
    case code === 85:
    case code === 86:
      return 'Snow';
    case code === 95:
    case code === 96:
    case code === 99:
      return 'Thunderstorm';
    default:
      return 'Cloudy';
  }
}

/** Condition + day/night → render-ready icon key. */
function iconKindFor(condition: WeatherCondition, isDay: boolean): WeatherIconKind {
  switch (condition) {
    case 'Sunny':
    case 'Clear':
      return isDay ? 'clear-day' : 'clear-night';
    case 'Partly Cloudy':
      return isDay ? 'partly-day' : 'partly-night';
    case 'Cloudy':
      return 'cloudy';
    case 'Overcast':
      return 'overcast';
    case 'Fog':
      return 'fog';
    case 'Haze':
      return 'haze';
    case 'Drizzle':
    case 'Light Rain':
      return 'drizzle';
    case 'Rain':
      return 'rain';
    case 'Heavy Rain':
      return 'heavy-rain';
    case 'Thunderstorm':
      return 'thunder';
    case 'Snow':
      return 'snow';
    case 'Windy':
      return 'windy';
    default:
      return isDay ? 'partly-day' : 'partly-night';
  }
}

/** Emoji fallback kept for compact surfaces (map pins, search rows). */
function iconEmoji(kind: WeatherIconKind): string {
  const map: Record<WeatherIconKind, string> = {
    'clear-day': '☀️',
    'clear-night': '🌙',
    'partly-day': '⛅',
    'partly-night': '☁️',
    cloudy: '☁️',
    overcast: '🌥️',
    fog: '🌫️',
    haze: '🌫️',
    drizzle: '🌦️',
    rain: '🌧️',
    'heavy-rain': '🌧️',
    thunder: '⛈️',
    snow: '❄️',
    windy: '💨',
  };
  return map[kind];
}

/* -------------------------------------------------------------------------- */
/*  Service                                                                   */
/* -------------------------------------------------------------------------- */

class WeatherService {
  private cache = new Map<string, CacheEntry>();
  private inflight = new Map<string, Promise<unknown>>();
  /** The in-flight 50-city snapshot, so it runs once per day per page. */
  private seeding: Promise<void> | null = null;

  /* ----------------------------- cache helpers ---------------------------- */

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) return entry.data as T;
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  /** Collapses concurrent identical requests into one network call. */
  private dedupe<T>(key: string, factory: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing as Promise<T>;
    const promise = factory().finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Request failed: ${response.status}`);
    return (await response.json()) as T;
  }

  private forecastParams(latitudes: string, longitudes: string, days: number): URLSearchParams {
    return new URLSearchParams({
      latitude: latitudes,
      longitude: longitudes,
      current: CURRENT_FIELDS,
      hourly: HOURLY_FIELDS,
      daily: DAILY_FIELDS,
      timezone: 'auto',
      forecast_days: days.toString(),
      // One day of history so today's earlier hours are available — that is what
      // lets the rain timeline show the whole local day, not just the remainder.
      past_days: '1',
      wind_speed_unit: 'kmh',
    });
  }

  private buildForecastUrl(city: City, days = 7): string {
    return `${FORECAST_URL}?${this.forecastParams(city.lat.toString(), city.lng.toString(), days)}`;
  }

  /** One request for up to 25 coordinates — the daily snapshot covers 50 in two. */
  private buildBatchUrl(batch: City[], days = 7): string {
    return `${FORECAST_URL}?${this.forecastParams(
      batch.map((city) => city.lat).join(','),
      batch.map((city) => city.lng).join(','),
      days,
    )}`;
  }

  /* ---------------------------- daily file cache --------------------------- */

  /**
   * Snapshots the whole bundled list to `data/weather-cache.json`, once, on the
   * day's first load. Later loads only refresh the city being looked at (see
   * `rememberCity`), so the day costs two requests for the fifty plus one per
   * visit — and when the quota runs dry the cards rebuild from what was saved.
   */
  async seedDailyCache(list: City[], limit = DAILY_SEED_CITIES): Promise<void> {
    if (this.seeding) return this.seeding;
    const run = this.runDailySeed(list.slice(0, limit)).finally(() => {
      this.seeding = null;
    });
    this.seeding = run;
    return run;
  }

  private async runDailySeed(targets: City[]): Promise<void> {
    try {
      // A new day starts by throwing the old document away — the file holds one
      // day only — then filling today's, so a load on a new day clears yesterday
      // even if the API answers nothing.
      const doc = await dailyCache.startToday();
      await dailyCache.flush();
      const missing = targets.filter((city) => !doc.cities[cityKey(city)]);
      if (missing.length === 0) return;
      const saved = await this.fetchPayloads(missing);
      if (saved.length === 0) return;
      await dailyCache.mutate((next) => {
        saved.forEach(({ city, payload }) => {
          next.cities[cityKey(city)] = {
            city,
            payload,
            fetchedAt: Date.now(),
            fetchedAtLabel: localClock(payload.utc_offset_seconds ?? 0).time,
          };
        });
        next.seededAt = Date.now();
      });
      // The seed is the record the whole day depends on — land it immediately
      // rather than waiting for the burst of per-city updates to settle.
      await dailyCache.flush();
    } catch (error) {
      console.error('Daily weather snapshot failed:', error);
    }
  }

  /** Full hourly + daily payloads, batched 25 coordinates per request. */
  private async fetchPayloads(list: City[]): Promise<Array<{ city: City; payload: OpenMeteoResponse }>> {
    const saved: Array<{ city: City; payload: OpenMeteoResponse }> = [];
    await Promise.all(
      chunk(list, BATCH_SIZE).map(async (batch) => {
        try {
          const payload = await this.fetchJson<OpenMeteoResponse[] | OpenMeteoResponse>(
            this.buildBatchUrl(batch),
          );
          const rows = Array.isArray(payload) ? payload : [payload];
          rows.forEach((row, index) => {
            const city = batch[index];
            if (city && row?.current) saved.push({ city, payload: row });
          });
        } catch (error) {
          console.error('Daily weather snapshot batch failed:', error);
        }
      }),
    );
    return saved;
  }

  /** Keeps today's saved copy of one city current — the per-load refresh. */
  private rememberCity(city: City, payload: OpenMeteoResponse): void {
    void dailyCache
      .mutate((doc) => {
        doc.cities[cityKey(city)] = {
          city,
          payload,
          fetchedAt: Date.now(),
          fetchedAtLabel: localClock(payload.utc_offset_seconds ?? 0).time,
        };
      })
      .catch(() => {
        /* the snapshot is a convenience, never a reason to fail a request */
      });
  }

  private rememberAirQuality(city: City, reading: AirQualityData): void {
    void dailyCache
      .mutate((doc) => {
        doc.aqi[cityKey(city)] = {
          at: Date.now(),
          label: localClock(offsetSecondsForZone(city.timezone)).time,
          reading,
        };
      })
      .catch(() => {
        /* ignore */
      });
  }

  /** Today's saved snapshot for a city, re-anchored to the current hour. */
  private async savedWeather(city: City): Promise<WeatherData | null> {
    const doc = await dailyCache.get();
    const entry = doc?.cities[cityKey(city)];
    if (!entry) return null;
    try {
      return this.parseWeatherData(city, entry.payload as OpenMeteoResponse, {
        fromCache: true,
        savedAtLabel: entry.fetchedAtLabel,
      });
    } catch (error) {
      console.error(`Saved weather for ${city.name} is unusable:`, error);
      return null;
    }
  }

  /** The observation for "now", taken from the hourly row when `current` is stale. */
  private observationAt(data: OpenMeteoResponse, index: number): OpenMeteoResponse['current'] {
    const { current, hourly } = data;
    const at = (values: number[] | undefined, fallback: number) => values?.[index] ?? fallback;
    return {
      time: hourly?.time?.[index] ?? current.time,
      temperature_2m: at(hourly?.temperature_2m, current.temperature_2m),
      relative_humidity_2m: at(hourly?.relative_humidity_2m, current.relative_humidity_2m),
      apparent_temperature: at(hourly?.apparent_temperature, current.apparent_temperature),
      precipitation: at(hourly?.precipitation, current.precipitation),
      weather_code: at(hourly?.weather_code, current.weather_code),
      wind_speed_10m: at(hourly?.wind_speed_10m, current.wind_speed_10m),
      wind_direction_10m: at(hourly?.wind_direction_10m, current.wind_direction_10m),
      wind_gusts_10m: at(hourly?.wind_gusts_10m, current.wind_gusts_10m),
      surface_pressure: at(hourly?.surface_pressure, current.surface_pressure),
      pressure_msl: at(hourly?.pressure_msl, current.pressure_msl ?? current.surface_pressure),
      cloud_cover: at(hourly?.cloud_cover, current.cloud_cover ?? 0),
      is_day: hourly?.is_day?.[index] ?? current.is_day,
      precipitation_probability: at(
        hourly?.precipitation_probability,
        current.precipitation_probability ?? 0,
      ),
    };
  }

  /** Index of the hour a wall clock falls in, or -1 when the series stops short. */
  private hourIndexAt(data: OpenMeteoResponse, clock: { iso: string; time24: string }): number {
    const anchor = `${clock.iso}T${clock.time24.slice(0, 2)}`;
    const index = data.hourly?.time?.findIndex((time) => time.slice(0, 13) >= anchor) ?? -1;
    return index;
  }

  /* ------------------------------ full detail ----------------------------- */

  async getWeather(city: City): Promise<WeatherData> {
    const cacheKey = `weather::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`;
    const cached = this.getCache<WeatherData>(cacheKey);
    if (cached) return { ...cached, fetchedAt: cached.fetchedAt };

    return this.dedupe(cacheKey, async () => {
      try {
        const data = await this.fetchJson<OpenMeteoResponse>(this.buildForecastUrl(city, 7));
        const parsed = this.parseWeatherData(city, data);
        this.setCache(cacheKey, parsed);
        // Keep the day's file current for whichever city is on screen.
        this.rememberCity(city, data);
        return parsed;
      } catch (error) {
        console.warn(`Live weather for ${city.name} unavailable — reading today's snapshot:`, error);
        const saved = await this.savedWeather(city);
        if (saved) return saved;
        return this.getFallbackWeather(city);
      }
    });
  }

  private parseWeatherData(
    city: City,
    data: OpenMeteoResponse,
    opts: { fromCache?: boolean; savedAtLabel?: string } = {},
  ): WeatherData {
    const { hourly, daily } = data;
    const offset = data.utc_offset_seconds ?? 0;
    const clock = localClock(offset);

    /* `past_days=1` puts yesterday at the head of the daily series, so index 0 is
       no longer today. The city's own wall-clock date is the only safe anchor. */
    const todayIso = clock.iso;
    const todayIndex = Math.max(0, daily.time.indexOf(todayIso));

    /* ---- locate "now" inside the hourly series using the city's own clock -- */
    // A saved payload's `current.time` is frozen at capture time, so the cached
    // path anchors on the city's wall clock instead — reading the file at 6 PM
    // then describes 6 PM, not the hour the file was written.
    const anchor = opts.fromCache
      ? `${todayIso}T${clock.time24.slice(0, 2)}`
      : data.current.time.slice(0, 13); // 2026-09-17T13
    let startIndex = hourly.time.findIndex((t) => t.slice(0, 13) >= anchor);
    if (startIndex < 0) startIndex = 0;

    /* A saved `current` block is hours old; take the observation from the hourly
       row we just anchored on so every panel reads the same moment. */
    const current = opts.fromCache ? this.observationAt(data, startIndex) : data.current;

    /* ---- sunrise / sunset lookup per calendar day ------------------------- */
    const sunByDate = new Map<string, { rise: number; set: number; riseIso: string; setIso: string }>();
    daily.time.forEach((date, index) => {
      const riseIso = daily.sunrise[index];
      const setIso = daily.sunset[index];
      if (!riseIso || !setIso) return;
      sunByDate.set(date, {
        rise: minutesFromIso(riseIso),
        set: minutesFromIso(setIso),
        riseIso,
        setIso,
      });
    });

    /* ---- hourly ----------------------------------------------------------- */
    const hourlyForecast: HourlyForecast[] = [];
    const end = Math.min(hourly.time.length, startIndex + HOURLY_WINDOW);

    for (let i = startIndex; i < end; i++) {
      const time = hourly.time[i];
      const isDay = hourly.is_day?.[i] === 1;
      const code = hourly.weather_code[i];
      const condition = wmoToCondition(code, isDay);
      const kind = iconKindFor(condition, isDay);
      const hourTemp = hourly.temperature_2m[i];

      hourlyForecast.push({
        time,
        label: formatHourLabel(time),
        dayLabel: dayLabelFromIso(time),
        isNow: i === startIndex,
        isDay,
        temp: Math.round(hourTemp),
        feelsLike: Math.round(hourly.apparent_temperature?.[i] ?? hourTemp),
        condition,
        icon: iconEmoji(kind),
        iconKind: kind,
        precipProb: Math.round(hourly.precipitation_probability?.[i] ?? 0),
        rainfall: Math.round((hourly.precipitation?.[i] ?? 0) * 10) / 10,
        humidity: Math.round(hourly.relative_humidity_2m?.[i] ?? current.relative_humidity_2m),
        dewPoint:
          hourly.dew_point_2m?.[i] !== undefined
            ? Math.round(hourly.dew_point_2m[i])
            : Math.round(computeDewPoint(hourTemp, hourly.relative_humidity_2m?.[i] ?? 60)),
        wind: Math.round(hourly.wind_speed_10m?.[i] ?? 0),
        windGust: Math.round(hourly.wind_gusts_10m?.[i] ?? 0),
        windDirection: Math.round(hourly.wind_direction_10m?.[i] ?? 0),
        uvIndex: Math.round(hourly.uv_index?.[i] ?? 0),
        pressure: Math.round(hourly.surface_pressure?.[i] ?? current.surface_pressure),
      });
    }

    /* ---- today's rain timeline -------------------------------------------- */
    // Every hour of the city's current calendar day — hours that have already
    // passed included, so the card can show the whole day's timings rather than
    // only what is left of it.
    const rainSlots: RainSlot[] = [];
    hourly.time.forEach((time, index) => {
      if (!time.startsWith(todayIso)) return;
      rainSlots.push({
        time,
        label: formatHourLabel(time),
        hour: Number(time.slice(11, 13)),
        precipProb: Math.round(hourly.precipitation_probability?.[index] ?? 0),
        rainfall: Math.round((hourly.precipitation?.[index] ?? 0) * 10) / 10,
        condition: wmoToCondition(hourly.weather_code[index], hourly.is_day?.[index] === 1),
        isPast: index < startIndex,
        isNow: index === startIndex,
      });
    });
    const todayRain = buildRainOutlook(rainSlots);

    /* ---- when rain is next possible (one answer for every card) ----------- */
    const nextRain = this.nextRainFrom(hourlyForecast, todayIso);

    /* ---- daily ------------------------------------------------------------ */
    // Any past day at the head of the series is dropped, and the week starts today.
    const forecast: DayForecast[] = daily.time
      .map((date, index) => ({ date, index }))
      .filter((entry) => entry.index >= todayIndex)
      .slice(0, 7)
      .map(({ date, index }) => {
        const dayCode = daily.weather_code[index];
        const condition = wmoToCondition(dayCode, true);
        const kind = iconKindFor(condition, true);
        const sun = sunByDate.get(date);

        return {
          date,
          isToday: date === todayIso,
          day: dayLabelFromIso(date),
          dateLabel: shortDateFromIso(date),
          tempMax: Math.round(daily.temperature_2m_max[index]),
          tempMin: Math.round(daily.temperature_2m_min[index]),
          condition,
          icon: iconEmoji(kind),
          iconKind: kind,
          // Today's row reports the same peak and total the rain timeline does.
          // Open-Meteo's own daily maximum is a separate aggregate and reads as a
          // contradiction next to the hourly timeline, so the hourly figures win.
          rainProb: date === todayIso ? todayRain.peakProb : Math.round(daily.precipitation_probability_max?.[index] ?? 0),
          rainfall:
            date === todayIso
              ? todayRain.totalRainfall
              : Math.round((daily.precipitation_sum?.[index] ?? 0) * 10) / 10,
          windSpeed: Math.round(daily.wind_speed_10m_max?.[index] ?? 0),
          windGust: Math.round(daily.wind_gusts_10m_max?.[index] ?? 0),
          humidity: Math.round(current.relative_humidity_2m),
          uvIndex: Math.round(daily.uv_index_max?.[index] ?? 0),
          sunrise: sun ? formatClockFromIso(sun.riseIso) : '—',
          sunset: sun ? formatClockFromIso(sun.setIso) : '—',
          daylight: daily.daylight_duration?.[index] ? formatDuration(daily.daylight_duration[index]) : '—',
        };
      });

    /* ---- current ---------------------------------------------------------- */
    const isDay = current.is_day === 1;
    const condition = wmoToCondition(current.weather_code, isDay);
    const kind = iconKindFor(condition, isDay);

    const nowIndex = startIndex;
    const nowHour = hourlyForecast[0];

    const todaySun = sunByDate.get(todayIso);
    const sunriseMinutes = todaySun?.rise ?? 6 * 60;
    const sunsetMinutes = todaySun?.set ?? 18 * 60;
    const sunrise = todaySun ? formatClockFromIso(todaySun.riseIso) : '—';
    const sunset = todaySun ? formatClockFromIso(todaySun.setIso) : '—';
    const solarNoonMinutes = Math.round((sunriseMinutes + sunsetMinutes) / 2);
    const dayProgress = Math.min(1, Math.max(0, (clock.minutes - sunriseMinutes) / Math.max(1, sunsetMinutes - sunriseMinutes)));

    const visibilityMeters = hourly.visibility?.[nowIndex];
    const visibilityKm = visibilityMeters !== undefined ? Math.round((visibilityMeters / 1000) * 10) / 10 : 10;

    const dewPoint =
      hourly.dew_point_2m?.[nowIndex] !== undefined
        ? Math.round(hourly.dew_point_2m[nowIndex] * 10) / 10
        : computeDewPoint(current.temperature_2m, current.relative_humidity_2m);

    const moon = getMoonPhase();

    const weatherData: WeatherData = {
      city: city.name,
      country: city.country,
      countryCode: city.countryCode,
      flag: city.flag,
      lat: data.latitude,
      lng: data.longitude,
      timezone: data.timezone || city.timezone,
      timezoneAbbr: data.timezone_abbreviation || '',
      utcOffsetSeconds: offset,
      localTime: clock.time,
      localDate: `${clock.weekday}, ${clock.date}`,
      localMinutes: clock.minutes,

      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(
        current.apparent_temperature ??
          (current.temperature_2m > 27
            ? computeHeatIndex(current.temperature_2m, current.relative_humidity_2m)
            : computeWindChill(current.temperature_2m, current.wind_speed_10m)),
      ),
      tempMin: Math.round(daily.temperature_2m_min[todayIndex]),
      tempMax: Math.round(daily.temperature_2m_max[todayIndex]),
      condition,
      icon: iconEmoji(kind),
      iconKind: kind,
      isDay,

      humidity: Math.round(current.relative_humidity_2m),
      dewPoint,
      windSpeed: Math.round(current.wind_speed_10m),
      windGust: Math.round(current.wind_gusts_10m),
      windDirection: Math.round(current.wind_direction_10m),
      windDirectionText: getWindDirectionText(current.wind_direction_10m),
      visibility: visibilityKm,
      pressure: Math.round(current.surface_pressure),
      pressureMsl: Math.round(current.pressure_msl ?? current.surface_pressure),
      cloudCover: Math.round(current.cloud_cover ?? 0),
      uvIndex: Math.round(hourly.uv_index?.[nowIndex] ?? daily.uv_index_max?.[todayIndex] ?? 0),

      sunrise,
      sunset,
      sunriseMinutes,
      sunsetMinutes,
      solarNoon: formatHourLabel(
        `2000-01-01T${Math.floor(solarNoonMinutes / 60)
          .toString()
          .padStart(2, '0')}:${(solarNoonMinutes % 60).toString().padStart(2, '0')}`,
      ),
      dayLength: todaySun ? formatDuration((sunsetMinutes - sunriseMinutes) * 60) : '—',
      dayProgress,
      moonPhase: moon.name,
      moonPhaseIcon: moon.icon,
      moonIllumination: moon.illumination,

      rainProbability: nowHour?.precipProb ?? 0,
      rainfall: Math.round((current.precipitation ?? 0) * 10) / 10,

      dataSource: opts.fromCache ? 'cache' : 'live',
      savedAtLabel: opts.savedAtLabel,
      todayRain,
      nextRain,
      hourly: hourlyForecast,
      forecast,
      alerts: [],

      lastUpdated: clock.time,
      lastUpdatedIso: new Date().toISOString(),
      fetchedAt: Date.now(),
    };

    return weatherData;
  }

  /**
   * The first hour from now where rain is possible, preferring nothing at all
   * over a guess: the hourly list starts at the current hour, so index 0 is
   * "this hour", and the day hint is resolved against the city's own date.
   */
  private nextRainFrom(hours: HourlyForecast[], todayIso: string): RainEta | null {
    for (let index = 0; index < hours.length; index++) {
      const hour = hours[index];
      if (!isRainHour(hour)) continue;
      const offset = daysBetweenIso(todayIso, hour.time.slice(0, 10));
      return {
        time: hour.time,
        label: hour.label,
        dayHint: offset <= 0 ? '' : offset === 1 ? 'tomorrow' : hour.dayLabel,
        precipProb: hour.precipProb,
        rainfall: hour.rainfall,
        hoursAway: index,
      };
    }
    return null;
  }

  /* --------------------------- batch summaries ---------------------------- */

  /**
   * One request per 25 cities instead of one request per city — this is what
   * keeps the 50-city grid and the global map from hammering the API.
   */
  async getCitySummaries(list: City[], force = false): Promise<Map<string, CitySummary>> {
    const cacheKey = `summaries::${list.map((c) => `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`).join('|')}`;
    if (!force) {
      const cached = this.getCache<Map<string, CitySummary>>(cacheKey);
      if (cached) return cached;
    }
    // Two panels can mount in the same tick (and StrictMode mounts twice), so
    // collapse them: the batch must not be paid for twice.
    return this.dedupe(cacheKey, () => this.fetchCitySummaries(list, cacheKey));
  }

  private async fetchCitySummaries(list: City[], cacheKey: string): Promise<Map<string, CitySummary>> {
    const result = new Map<string, CitySummary>();
    const batches = chunk(list, BATCH_SIZE);
    await Promise.all(
      batches.map(async (batch) => {
        const params = new URLSearchParams({
          latitude: batch.map((c) => c.lat).join(','),
          longitude: batch.map((c) => c.lng).join(','),
          current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,precipitation_probability',
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
          // The hourly chance is what the detail card charts, so the grid quotes
          // the same metric instead of Open-Meteo's separate daily aggregate.
          hourly: 'precipitation_probability',
          timezone: 'auto',
          forecast_days: '1',
          wind_speed_unit: 'kmh',
        });

        try {
          const payload = await this.fetchJson<OpenMeteoResponse[] | OpenMeteoResponse>(
            `${FORECAST_URL}?${params}`,
          );
          const rows = Array.isArray(payload) ? payload : [payload];

          rows.forEach((row, index) => {
            const city = batch[index];
            if (!city) return;
            const summary = this.summaryFor(city, row, 'live');
            if (summary) result.set(city.name, summary);
          });
        } catch (error) {
          console.error('Batch weather fetch failed:', error);
          // Fall back to the day's snapshot before giving up on this batch.
          const doc = await dailyCache.get();
          batch.forEach((city) => {
            const entry = doc?.cities[cityKey(city)];
            if (!entry) return;
            const summary = this.summaryFor(
              city,
              entry.payload as OpenMeteoResponse,
              'cache',
              doc?.aqi[cityKey(city)]?.reading ?? null,
            );
            if (summary) result.set(city.name, summary);
          });
        }
      }),
    );

    // Fill gaps with the offline fallback so the grid is never empty.
    list.forEach((city) => {
      if (result.has(city.name)) return;
      const fallback = this.getFallbackWeather(city);
      result.set(city.name, {
        city,
        temperature: fallback.temperature,
        feelsLike: fallback.feelsLike,
        condition: fallback.condition,
        icon: fallback.icon,
        iconKind: fallback.iconKind,
        isDay: fallback.isDay,
        tempMax: fallback.tempMax,
        tempMin: fallback.tempMin,
        humidity: fallback.humidity,
        windSpeed: fallback.windSpeed,
        rainProbability: fallback.todayRain.peakProb,
        aqi: null,
        aqiCategory: null,
        localTime: fallback.localTime,
      });
    });

    this.setCache(cacheKey, result);
    return result;
  }

  /**
   * One city's grid card, from either a live row or today's saved payload. A
   * saved payload's `current` block is hours old, so on that path the reading
   * comes from the hourly row for *now* — the grid should show the afternoon's
   * weather, not whatever the morning snapshot happened to catch.
   */
  private summaryFor(
    city: City,
    row: OpenMeteoResponse,
    source: 'live' | 'cache',
    savedAqi: AirQualityData | null = null,
  ): CitySummary | null {
    if (!row?.current) return null;
    const clock = localClock(row.utc_offset_seconds ?? 0);
    const index = this.hourIndexAt(row, clock);
    const observation = source === 'cache' && index >= 0 ? this.observationAt(row, index) : row.current;
    const todayIndex = Math.max(0, row.daily?.time?.indexOf(clock.iso) ?? 0);

    const isDay = observation.is_day === 1;
    const condition = wmoToCondition(observation.weather_code, isDay);
    const kind = iconKindFor(condition, isDay);
    const aqi =
      savedAqi?.aqi ?? this.getCache<number>(`aqi-value::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`) ?? null;

    /* Today's hourly peak — the figure the timeline and the hourly strip report.
       The API's daily maximum is a separate aggregate and reads as a
       contradiction when the two sit on the same page. */
    const hourlyProbabilities = (row.hourly?.precipitation_probability ?? []) as number[];
    const todayProbabilities = hourlyProbabilities.filter((_, index) =>
      (row.hourly?.time?.[index] ?? '').startsWith(clock.iso),
    );
    const rainProbability = todayProbabilities.length
      ? Math.max(...todayProbabilities)
      : Math.round(row.daily?.precipitation_probability_max?.[todayIndex] ?? 0);

    return {
      city,
      temperature: Math.round(observation.temperature_2m),
      feelsLike: Math.round(observation.apparent_temperature ?? observation.temperature_2m),
      condition,
      icon: iconEmoji(kind),
      iconKind: kind,
      isDay,
      tempMax: Math.round(row.daily?.temperature_2m_max?.[todayIndex] ?? observation.temperature_2m),
      tempMin: Math.round(row.daily?.temperature_2m_min?.[todayIndex] ?? observation.temperature_2m),
      humidity: Math.round(observation.relative_humidity_2m),
      windSpeed: Math.round(observation.wind_speed_10m),
      rainProbability,
      aqi,
      aqiCategory: aqi !== null ? getAQICategory(aqi) : null,
      localTime: clock.time,
    };
  }

  /* ------------------------------ air quality ----------------------------- */

  async getAirQuality(city: City): Promise<AirQualityData | null> {
    const cacheKey = `aqi::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`;
    const cached = this.getCache<AirQualityData>(cacheKey);
    if (cached) return cached;

    // Several panels ask for the same city's air quality; one request serves them
    // all (and one saved copy, rather than one per panel).
    return this.dedupe(cacheKey, async () => {
      try {
        const params = new URLSearchParams({
          latitude: city.lat.toString(),
          longitude: city.lng.toString(),
          current: 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide',
        });
        const data = await this.fetchJson<OpenMeteoAQIResponse>(`${AIR_URL}?${params}`);
        const parsed = this.parseAirQuality(data);
        this.setCache(cacheKey, parsed);
        this.setCache(`aqi-value::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`, parsed.aqi);
        this.rememberAirQuality(city, parsed);
        return parsed;
      } catch (error) {
        console.error(`Failed to fetch AQI for ${city.name}:`, error);
        return (await dailyCache.get())?.aqi[cityKey(city)]?.reading ?? null;
      }
    });
  }

  /** Batch AQI so the grid can show a real reading instead of a placeholder. */
  async getAirQualityBatch(list: City[]): Promise<void> {
    const key = `aqi-batch::${list.map((city) => `${city.lat.toFixed(2)},${city.lng.toFixed(2)}`).join('|')}`;
    return this.dedupe(key, () => this.fetchAirQualityBatch(list));
  }

  private async fetchAirQualityBatch(list: City[]): Promise<void> {
    const batches = chunk(list, BATCH_SIZE);
    await Promise.all(
      batches.map(async (batch) => {
        const params = new URLSearchParams({
          latitude: batch.map((c) => c.lat).join(','),
          longitude: batch.map((c) => c.lng).join(','),
          current: 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide',
        });
        try {
          const payload = await this.fetchJson<OpenMeteoAQIResponse[] | OpenMeteoAQIResponse>(
            `${AIR_URL}?${params}`,
          );
          const rows = Array.isArray(payload) ? payload : [payload];
          rows.forEach((row, index) => {
            const city = batch[index];
            if (!city || !row?.current) return;
            const parsed = this.parseAirQuality(row);
            this.setCache(`aqi::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`, parsed);
            this.setCache(`aqi-value::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`, parsed.aqi);
          });
        } catch (error) {
          console.error('Batch AQI fetch failed:', error);
          // Read the day's saved readings into the cache instead of leaving gaps.
          const doc = await dailyCache.get();
          batch.forEach((city) => {
            const saved = doc?.aqi[cityKey(city)];
            if (!saved) return;
            this.setCache(`aqi::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`, saved.reading);
            this.setCache(`aqi-value::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`, saved.reading.aqi);
          });
        }
      }),
    );
  }

  private parseAirQuality(data: OpenMeteoAQIResponse): AirQualityData {
    const current = data.current;
    const aqi = Math.round(current.us_aqi ?? 0);
    const base: AirQualityData = {
      aqi,
      category: getAQICategory(aqi),
      scale: getAQIScale(aqi),
      pm25: Math.round((current.pm2_5 ?? 0) * 10) / 10,
      pm10: Math.round(current.pm10 ?? 0),
      no2: Math.round((current.nitrogen_dioxide ?? 0) * 10) / 10,
      o3: Math.round((current.ozone ?? 0) * 10) / 10,
      so2: Math.round((current.sulphur_dioxide ?? 0) * 10) / 10,
      co: Math.round(current.carbon_monoxide ?? 0),
      dominant: '',
      dominantValue: 0,
    };
    const dominant = getDominantPollutant(base);
    return { ...base, dominant: dominant.label, dominantValue: dominant.value };
  }

  /**
   * Re-reads the cached AQI values into an existing summary map. This lets the
   * grid show real air-quality numbers without re-issuing the weather batch.
   */
  attachAirQuality(summaries: Map<string, CitySummary>): Map<string, CitySummary> {
    const next = new Map<string, CitySummary>();
    summaries.forEach((summary, key) => {
      const aqi =
        this.getCache<number>(`aqi-value::${summary.city.lat.toFixed(3)},${summary.city.lng.toFixed(3)}`) ?? null;
      next.set(key, {
        ...summary,
        aqi,
        aqiCategory: aqi !== null ? getAQICategory(aqi) : null,
      });
    });
    return next;
  }

  /* --------------------------- geocoding search --------------------------- */

  async searchCities(query: string, limit = 6): Promise<City[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) return [];

    const cacheKey = `geo::${trimmed.toLowerCase()}::${limit}`;
    const cached = this.getCache<City[]>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        name: trimmed,
        count: Math.max(limit, 5).toString(),
        language: 'en',
        format: 'json',
      });
      const data = await this.fetchJson<{ results?: GeocodeResult[] }>(`${GEOCODE_URL}?${params}`);
      const results = (data.results ?? [])
        .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))
        .slice(0, limit)
        .map<City>((row) => ({
          name: row.name,
          country: row.country ?? 'Unknown',
          countryCode: (row.country_code ?? '').toUpperCase(),
          flag: countryCodeToFlag(row.country_code ?? ''),
          continent: continentFromCoordinates(row.latitude, row.longitude),
          lat: row.latitude,
          lng: row.longitude,
          timezone: row.timezone ?? 'auto',
          admin1: row.admin1,
          population: row.population,
          discovered: true,
        }));

      this.setCache(cacheKey, results);
      return results;
    } catch (error) {
      console.error('Geocoding search failed:', error);
      return [];
    }
  }

  /* ------------------------------- fallback ------------------------------- */

  private getFallbackWeather(city: City): WeatherData {
    const seed = Array.from(city.name).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const utcOffsetSeconds = offsetSecondsForZone(city.timezone);
    const clock = localClock(utcOffsetSeconds);
    const moon = getMoonPhase();

    /** Stable pseudo-random 0..1, so every panel tells the same story. */
    const noise = (slot: number) => {
      const raw = Math.sin(seed * 12.9898 + slot * 78.233) * 43758.5453;
      return raw - Math.floor(raw);
    };

    const nowHour = Math.floor(clock.minutes / 60);
    const isDayAt = (hour: number) => hour >= 6 && hour < 19;

    /* A city's own local date, so the week opens on *its* today. */
    const localDateAt = (dayOffset: number) => {
      const date = new Date(`${clock.iso}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + dayOffset);
      return date.toISOString().slice(0, 10);
    };
    const clockLabel = (minutes: number) =>
      formatHourLabel(
        `2000-01-01T${Math.floor(minutes / 60)
          .toString()
          .padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`,
      );

    /* One rain band a day, placed by the city name. The sky, the hourly strip and
       the rain timeline all read from it, so they can never contradict each other. */
    const peakHour = 5 + (seed % 16); // somewhere between 5 AM and 8 PM
    const rainChanceAt = (hour: number) => {
      const gap = Math.abs(hour - peakHour) % 24;
      const distance = Math.min(gap, 24 - gap);
      return Math.round(Math.max(4, 82 * Math.exp(-(distance * distance) / 4)));
    };
    const rainAmountAt = (hour: number) => {
      const chance = rainChanceAt(hour);
      return chance >= 60 ? Math.round((chance / 40) * 10) / 10 : 0;
    };
    const conditionAt = (hour: number): WeatherCondition => {
      const chance = rainChanceAt(hour);
      if (chance >= 70) return 'Rain';
      if (chance >= 45) return 'Light Rain';
      if (chance >= 25) return 'Cloudy';
      return isDayAt(hour) ? 'Sunny' : 'Clear';
    };

    const baseTemp = 12 + (seed % 16);
    const tempAtHour = (hour: number) => Math.round(baseTemp + Math.sin(((hour - 4) / 24) * Math.PI * 2) * 5);
    const humidityAtHour = (hour: number) =>
      Math.round(
        Math.min(95, Math.max(32, 56 + 26 * Math.sin(((hour + 3) / 24) * Math.PI * 2) + rainChanceAt(hour) / 5)),
      );
    const windAtHour = (hour: number) =>
      Math.round(7 + 10 * Math.abs(Math.sin(((hour + 9) / 24) * Math.PI * 2)) + rainChanceAt(hour) / 14);

    const hourly: HourlyForecast[] = Array.from({ length: 24 }, (_, index) => {
      const hour = (nowHour + index) % 24;
      const isDay = isDayAt(hour);
      const condition = conditionAt(hour);
      const kind = iconKindFor(condition, isDay);
      const temp = tempAtHour(hour);
      const humidity = humidityAtHour(hour);
      // Real dates, not placeholders: the shared "when does it next rain" logic
      // reads the calendar day off this string, exactly as it does for live data.
      const iso = `${localDateAt(Math.floor((nowHour + index) / 24))}T${hour.toString().padStart(2, '0')}:00`;
      return {
        time: iso,
        label: formatHourLabel(iso),
        dayLabel: dayLabelFromIso(iso),
        isNow: index === 0,
        isDay,
        temp,
        feelsLike: temp + (humidity > 70 ? 2 : -1),
        condition,
        icon: iconEmoji(kind),
        iconKind: kind,
        precipProb: rainChanceAt(hour),
        rainfall: rainAmountAt(hour),
        humidity,
        dewPoint: Math.round(computeDewPoint(temp, humidity)),
        wind: windAtHour(hour),
        windGust: windAtHour(hour) + 6 + Math.round(noise(hour + 40) * 9),
        windDirection: Math.round(noise(hour + 70) * 360),
        uvIndex: isDay ? Math.round(Math.max(0, 9 - rainChanceAt(hour) / 10) * Math.sin(((hour - 6) / 12) * Math.PI)) : 0,
        pressure: Math.round(1005 + noise(hour + 110) * 17),
      };
    });

    /* The whole local day, so the offline card still shows when rain is likely. */
    const rainSlots: RainSlot[] = Array.from({ length: 24 }, (_, hour) => {
      const iso = `2000-01-01T${hour.toString().padStart(2, '0')}:00`;
      return {
        time: iso,
        label: formatHourLabel(iso),
        hour,
        precipProb: rainChanceAt(hour),
        rainfall: rainAmountAt(hour),
        condition: conditionAt(hour),
        isPast: hour < nowHour,
        isNow: hour === nowHour,
      };
    });
    const todayRain = buildRainOutlook(rainSlots);
    const nextRain = this.nextRainFrom(hourly, clock.iso);

    const forecast: DayForecast[] = Array.from({ length: 7 }, (_, index) => {
      const date = localDateAt(index);
      const today = index === 0;
      // A slow multi-day drift plus a little day-to-day noise, so no two days in
      // the week ever read as identical.
      const drift = Math.round(Math.sin((index + (seed % 7)) / 3.1) * 3);
      const swing = Math.round((noise(index * 5) - 0.5) * 5);
      const outlook = FALLBACK_DAY_CONDITIONS[Math.floor(noise(index * 13) * FALLBACK_DAY_CONDITIONS.length)];
      const dayCondition: WeatherCondition = today ? conditionAt(peakHour) : outlook.condition;
      const kind = iconKindFor(dayCondition, true);
      const sunriseMinutes = 355 + index;
      const sunsetMinutes = 1105 - index;

      return {
        date,
        isToday: today,
        day: dayLabelFromIso(date),
        dateLabel: shortDateFromIso(date),
        // Today comes straight from the hourly series, so the 7-day curves and the
        // 24 h curves describe the same weather.
        tempMax: today ? Math.max(...hourly.map((entry) => entry.temp)) : baseTemp + 5 + drift + swing,
        tempMin: today ? Math.min(...hourly.map((entry) => entry.temp)) : baseTemp - 3 + drift + swing,
        condition: dayCondition,
        icon: iconEmoji(kind),
        iconKind: kind,
        rainProb: today ? todayRain.peakProb : outlook.chance,
        rainfall: today ? todayRain.totalRainfall : outlook.rainfall,
        windSpeed: today ? Math.max(...hourly.map((entry) => entry.wind)) : Math.max(4, windAtHour(12) + drift * 2 + swing),
        windGust: today
          ? Math.max(...hourly.map((entry) => entry.windGust))
          : Math.max(9, windAtHour(12) + drift * 2 + swing + 10),
        humidity: today
          ? Math.round(hourly.reduce((sum, entry) => sum + entry.humidity, 0) / hourly.length)
          : Math.round(Math.min(95, Math.max(35, humidityAtHour(12) + (outlook.chance - 40) / 4))),
        uvIndex: today ? Math.max(...hourly.map((entry) => entry.uvIndex)) : Math.round(4 + noise(index * 3) * 6),
        sunrise: clockLabel(sunriseMinutes),
        sunset: clockLabel(sunsetMinutes),
        daylight: formatDuration((sunsetMinutes - sunriseMinutes) * 60),
      };
    });

    /* Everything the current observation reports comes from the same first hourly
       entry, so the big card and the hourly strip can never disagree. */
    const now = hourly[0];

    return {
      city: city.name,
      country: city.country,
      countryCode: city.countryCode,
      flag: city.flag,
      lat: city.lat,
      lng: city.lng,
      timezone: city.timezone,
      timezoneAbbr: '',
      utcOffsetSeconds,
      localTime: clock.time,
      localDate: `${clock.weekday}, ${clock.date}`,
      localMinutes: clock.minutes,
      temperature: now.temp,
      feelsLike: now.feelsLike,
      tempMin: forecast[0].tempMin,
      tempMax: forecast[0].tempMax,
      condition: now.condition,
      icon: now.icon,
      iconKind: now.iconKind,
      isDay: now.isDay,
      humidity: now.humidity,
      dewPoint: now.dewPoint,
      windSpeed: now.wind,
      windGust: now.windGust,
      windDirection: now.windDirection,
      windDirectionText: getWindDirectionText(now.windDirection),
      visibility: Math.round((6 + noise(nowHour + 7) * 8) * 10) / 10,
      pressure: now.pressure,
      pressureMsl: now.pressure + 2,
      cloudCover: Math.min(100, Math.max(0, Math.round(now.precipProb * 1.1 + 12))),
      uvIndex: now.uvIndex,
      sunrise: forecast[0].sunrise,
      sunset: forecast[0].sunset,
      sunriseMinutes: 355,
      sunsetMinutes: 1105,
      solarNoon: clockLabel(Math.round((355 + 1105) / 2)),
      dayLength: forecast[0].daylight,
      dayProgress: Math.min(1, Math.max(0, (clock.minutes - 355) / (1105 - 355))),
      moonPhase: moon.name,
      moonPhaseIcon: moon.icon,
      moonIllumination: moon.illumination,
      rainProbability: now.precipProb,
      rainfall: now.rainfall,
      dataSource: 'sample',
      todayRain,
      nextRain,
      hourly,
      forecast,
      alerts: [],
      lastUpdated: clock.time,
      lastUpdatedIso: new Date().toISOString(),
      fetchedAt: Date.now(),
    };
  }

  clearCache(): void {
    this.cache.clear();
    this.inflight.clear();
  }
}

/* -------------------------------------------------------------------------- */
/*  Small local helpers                                                       */
/* -------------------------------------------------------------------------- */

/** Day shapes for the offline week, from driest to wettest. */
const FALLBACK_DAY_CONDITIONS: Array<{ condition: WeatherCondition; chance: number; rainfall: number }> = [
  { condition: 'Sunny', chance: 6, rainfall: 0 },
  { condition: 'Sunny', chance: 11, rainfall: 0 },
  { condition: 'Partly Cloudy', chance: 19, rainfall: 0 },
  { condition: 'Partly Cloudy', chance: 24, rainfall: 0 },
  { condition: 'Cloudy', chance: 34, rainfall: 0 },
  { condition: 'Cloudy', chance: 40, rainfall: 0 },
  { condition: 'Overcast', chance: 50, rainfall: 0.7 },
  { condition: 'Light Rain', chance: 63, rainfall: 3.6 },
  { condition: 'Light Rain', chance: 72, rainfall: 5.4 },
  { condition: 'Rain', chance: 86, rainfall: 12.2 },
];

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0)),
  );
}

/**
 * The city's current UTC offset in seconds, for the offline path.
 *
 * Resolved through the browser's IANA database first so daylight saving is
 * respected and *any* city — including one that only exists because the user
 * searched for it — gets a correct clock; the table below is a safety net for
 * the rare zone the runtime does not know.
 */
function offsetSecondsForZone(timezone: string): number {
  if (timezone && timezone !== 'auto') {
    try {
      return zoneOffsetMinutes(new Date(), timezone) * 60;
    } catch {
      /* unknown zone — fall back to the table */
    }
  }
  return KNOWN_TIMEZONE_OFFSETS[timezone] ?? 0;
}

/** Winter offsets for the bundled cities, used only if Intl cannot resolve the zone. */
const KNOWN_TIMEZONE_OFFSETS: Record<string, number> = {
    'Asia/Kolkata': 19800,
    'Asia/Tokyo': 32400,
    'Asia/Seoul': 32400,
    'Asia/Shanghai': 28800,
    'Asia/Singapore': 28800,
    'Asia/Bangkok': 25200,
    'Asia/Jakarta': 25200,
    'Asia/Dubai': 14400,
    'Asia/Riyadh': 10800,
    'Europe/Istanbul': 10800,
    'Europe/London': 3600,
    'Europe/Paris': 7200,
    'Europe/Berlin': 7200,
    'Europe/Rome': 7200,
    'Europe/Madrid': 7200,
    'Europe/Amsterdam': 7200,
    'Europe/Vienna': 7200,
    'Europe/Zurich': 7200,
    'Europe/Moscow': 10800,
    'Europe/Lisbon': 3600,
    'America/New_York': -14400,
    'America/Chicago': -18000,
    'America/Los_Angeles': -25200,
    'America/Toronto': -14400,
    'America/Vancouver': -25200,
    'America/Mexico_City': -21600,
    'America/Sao_Paulo': -10800,
    'America/Argentina/Buenos_Aires': -10800,
    'America/Lima': -18000,
    'America/Santiago': -14400,
    'Africa/Cairo': 10800,
    'Africa/Johannesburg': 7200,
    'Africa/Nairobi': 10800,
    'Africa/Lagos': 3600,
    'Australia/Sydney': 36000,
    'Australia/Melbourne': 36000,
    'Australia/Brisbane': 36000,
    'Australia/Perth': 28800,
  'Pacific/Auckland': 43200,
};

export const weatherService = new WeatherService();
