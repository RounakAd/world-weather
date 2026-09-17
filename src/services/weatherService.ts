import {
  AirQualityData,
  City,
  CitySummary,
  DayForecast,
  HourlyForecast,
  WeatherCondition,
  WeatherData,
  WeatherIconKind,
} from '../types/weather';
import { continentFromCoordinates } from '../data/cities';
import {
  chunk,
  computeDewPoint,
  computeHeatIndex,
  computeWindChill,
  formatClockFromIso,
  formatDuration,
  formatHourLabel,
  dayLabelFromIso,
  getAQICategory,
  getAQIScale,
  getDominantPollutant,
  getMoonPhase,
  getWindDirectionText,
  localClock,
  minutesFromIso,
  shortDateFromIso,
} from '../utils/helpers';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const AIR_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const HOURLY_WINDOW = 48; // hours of hourly forecast exposed to the UI
const BATCH_SIZE = 25; // coordinates per batched request

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

  private buildForecastUrl(city: City, days = 7): string {
    const params = new URLSearchParams({
      latitude: city.lat.toString(),
      longitude: city.lng.toString(),
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
    return `${FORECAST_URL}?${params}`;
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
        return parsed;
      } catch (error) {
        console.error(`Failed to fetch weather for ${city.name}:`, error);
        return this.getFallbackWeather(city);
      }
    });
  }

  private parseWeatherData(city: City, data: OpenMeteoResponse): WeatherData {
    const { current, hourly, daily } = data;
    const offset = data.utc_offset_seconds ?? 0;
    const clock = localClock(offset);

    /* ---- locate "now" inside the hourly series using the city's own clock -- */
    const currentIso = current.time.slice(0, 13); // 2026-09-17T13
    let startIndex = hourly.time.findIndex((t) => t.slice(0, 13) >= currentIso);
    if (startIndex < 0) startIndex = 0;

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

    /* ---- daily ------------------------------------------------------------ */
    const forecast: DayForecast[] = daily.time.map((date, index) => {
      const dayCode = daily.weather_code[index];
      const condition = wmoToCondition(dayCode, true);
      const kind = iconKindFor(condition, true);
      const sun = sunByDate.get(date);

      return {
        date,
        isToday: index === 0,
        day: dayLabelFromIso(date),
        dateLabel: shortDateFromIso(date),
        tempMax: Math.round(daily.temperature_2m_max[index]),
        tempMin: Math.round(daily.temperature_2m_min[index]),
        condition,
        icon: iconEmoji(kind),
        iconKind: kind,
        rainProb: Math.round(daily.precipitation_probability_max?.[index] ?? 0),
        rainfall: Math.round((daily.precipitation_sum?.[index] ?? 0) * 10) / 10,
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

    const todaySun = sunByDate.get(daily.time[0]);
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
      tempMin: Math.round(daily.temperature_2m_min[0]),
      tempMax: Math.round(daily.temperature_2m_max[0]),
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
      uvIndex: Math.round(hourly.uv_index?.[nowIndex] ?? daily.uv_index_max?.[0] ?? 0),

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

      hourly: hourlyForecast,
      forecast,
      alerts: [],

      lastUpdated: clock.time,
      lastUpdatedIso: new Date().toISOString(),
      fetchedAt: Date.now(),
    };

    return weatherData;
  }

  /* --------------------------- batch summaries ---------------------------- */

  /**
   * One request per 25 cities instead of one request per city — this is what
   * keeps the 50-city grid and the global map from hammering the API.
   */
  async getCitySummaries(list: City[], force = false): Promise<Map<string, CitySummary>> {
    const result = new Map<string, CitySummary>();
    const cacheKey = `summaries::${list.map((c) => `${c.lat.toFixed(2)},${c.lng.toFixed(2)}`).join('|')}`;
    if (!force) {
      const cached = this.getCache<Map<string, CitySummary>>(cacheKey);
      if (cached) return cached;
    }

    const batches = chunk(list, BATCH_SIZE);
    await Promise.all(
      batches.map(async (batch) => {
        const params = new URLSearchParams({
          latitude: batch.map((c) => c.lat).join(','),
          longitude: batch.map((c) => c.lng).join(','),
          current: 'temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,precipitation_probability',
          daily: 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
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
            if (!city || !row?.current) return;
            const isDay = row.current.is_day === 1;
            const condition = wmoToCondition(row.current.weather_code, isDay);
            const kind = iconKindFor(condition, isDay);
            const clock = localClock(row.utc_offset_seconds ?? 0);
            const aqi = this.getCache<number>(`aqi-value::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`) ?? null;

            result.set(city.name, {
              city,
              temperature: Math.round(row.current.temperature_2m),
              feelsLike: Math.round(row.current.apparent_temperature ?? row.current.temperature_2m),
              condition,
              icon: iconEmoji(kind),
              iconKind: kind,
              isDay,
              tempMax: Math.round(row.daily?.temperature_2m_max?.[0] ?? row.current.temperature_2m),
              tempMin: Math.round(row.daily?.temperature_2m_min?.[0] ?? row.current.temperature_2m),
              humidity: Math.round(row.current.relative_humidity_2m),
              windSpeed: Math.round(row.current.wind_speed_10m),
              rainProbability: Math.round(
                row.daily?.precipitation_probability_max?.[0] ?? row.current.precipitation_probability ?? 0,
              ),
              aqi,
              aqiCategory: aqi !== null ? getAQICategory(aqi) : null,
              localTime: clock.time,
            });
          });
        } catch (error) {
          console.error('Batch weather fetch failed:', error);
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
        rainProbability: fallback.rainProbability,
        aqi: null,
        aqiCategory: null,
        localTime: fallback.localTime,
      });
    });

    this.setCache(cacheKey, result);
    return result;
  }

  /* ------------------------------ air quality ----------------------------- */

  async getAirQuality(city: City): Promise<AirQualityData | null> {
    const cacheKey = `aqi::${city.lat.toFixed(3)},${city.lng.toFixed(3)}`;
    const cached = this.getCache<AirQualityData>(cacheKey);
    if (cached) return cached;

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
      return parsed;
    } catch (error) {
      console.error(`Failed to fetch AQI for ${city.name}:`, error);
      return null;
    }
  }

  /** Batch AQI so the grid can show a real reading instead of a placeholder. */
  async getAirQualityBatch(list: City[]): Promise<void> {
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
    const temp = 14 + (seed % 18);
    const condition: WeatherCondition = 'Partly Cloudy';
    const kind = iconKindFor(condition, true);
    const clock = localClock(offsetForTimezoneGuess(city.timezone));
    const moon = getMoonPhase();

    const hourly: HourlyForecast[] = Array.from({ length: 24 }, (_, index) => {
      const hour = (clock.minutes / 60 + index) % 24;
      const isDay = hour >= 6 && hour < 19;
      const tempAtHour = Math.round(temp + Math.sin(((hour - 4) / 24) * Math.PI * 2) * 4);
      const cond: WeatherCondition = isDay ? 'Partly Cloudy' : 'Clear';
      const k = iconKindFor(cond, isDay);
      const iso = `2000-01-01T${Math.floor(hour).toString().padStart(2, '0')}:00`;
      return {
        time: iso,
        label: formatHourLabel(iso),
        dayLabel: index === 0 ? 'Today' : 'Tomorrow',
        isNow: index === 0,
        isDay,
        temp: tempAtHour,
        feelsLike: tempAtHour + 1,
        condition: cond,
        icon: iconEmoji(k),
        iconKind: k,
        precipProb: 15 + (index % 4) * 6,
        rainfall: 0,
        humidity: 62,
        dewPoint: tempAtHour - 5,
        wind: 12,
        windGust: 20,
        windDirection: 180,
        uvIndex: isDay ? 5 : 0,
        pressure: 1013,
      };
    });

    const forecast: DayForecast[] = Array.from({ length: 7 }, (_, index) => {
      const d = new Date(Date.now() + index * 86400000);
      const iso = d.toISOString().slice(0, 10);
      return {
        date: iso,
        isToday: index === 0,
        day: dayLabelFromIso(iso),
        dateLabel: shortDateFromIso(iso),
        tempMax: temp + 3,
        tempMin: temp - 4,
        condition,
        icon: iconEmoji(kind),
        iconKind: kind,
        rainProb: 20 + (index % 3) * 10,
        rainfall: 0,
        windSpeed: 12,
        windGust: 20,
        humidity: 62,
        uvIndex: 5,
        sunrise: '6:00 AM',
        sunset: '6:30 PM',
        daylight: '12h 30m',
      };
    });

    return {
      city: city.name,
      country: city.country,
      countryCode: city.countryCode,
      flag: city.flag,
      lat: city.lat,
      lng: city.lng,
      timezone: city.timezone,
      timezoneAbbr: '',
      utcOffsetSeconds: offsetForTimezoneGuess(city.timezone),
      localTime: clock.time,
      localDate: `${clock.weekday}, ${clock.date}`,
      localMinutes: clock.minutes,
      temperature: temp,
      feelsLike: temp + 1,
      tempMin: temp - 4,
      tempMax: temp + 3,
      condition,
      icon: iconEmoji(kind),
      iconKind: kind,
      isDay: clock.minutes >= 360 && clock.minutes < 1140,
      humidity: 62,
      dewPoint: temp - 5,
      windSpeed: 12,
      windGust: 20,
      windDirection: 180,
      windDirectionText: 'S',
      visibility: 10,
      pressure: 1013,
      pressureMsl: 1015,
      cloudCover: 40,
      uvIndex: 5,
      sunrise: '6:00 AM',
      sunset: '6:30 PM',
      sunriseMinutes: 360,
      sunsetMinutes: 1110,
      solarNoon: '12:15 PM',
      dayLength: '12h 30m',
      dayProgress: 0.5,
      moonPhase: moon.name,
      moonPhaseIcon: moon.icon,
      moonIllumination: moon.illumination,
      rainProbability: 20,
      rainfall: 0,
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

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0)),
  );
}

/** Crude UTC-offset estimate used only by the offline fallback path. */
function offsetForTimezoneGuess(timezone: string): number {
  const known: Record<string, number> = {
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
  return known[timezone] ?? 0;
}

export const weatherService = new WeatherService();
