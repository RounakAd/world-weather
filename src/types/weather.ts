export interface City {
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  continent: Continent;
  lat: number;
  lng: number;
  timezone: string;
  /** Optional extra context for cities discovered through geocoding search. */
  admin1?: string;
  population?: number;
  /** true when the city came from the live geocoding search rather than the bundled list. */
  discovered?: boolean;
}

export type Continent = 'Asia' | 'Europe' | 'North America' | 'South America' | 'Africa' | 'Oceania';

export type WeatherCondition =
  | 'Sunny'
  | 'Clear'
  | 'Partly Cloudy'
  | 'Cloudy'
  | 'Overcast'
  | 'Light Rain'
  | 'Rain'
  | 'Heavy Rain'
  | 'Thunderstorm'
  | 'Drizzle'
  | 'Snow'
  | 'Fog'
  | 'Haze'
  | 'Windy';

/** Render-ready icon keys, resolved for day / night. */
export type WeatherIconKind =
  | 'clear-day'
  | 'clear-night'
  | 'partly-day'
  | 'partly-night'
  | 'cloudy'
  | 'overcast'
  | 'fog'
  | 'haze'
  | 'drizzle'
  | 'rain'
  | 'heavy-rain'
  | 'thunder'
  | 'snow'
  | 'windy';

export interface HourlyForecast {
  /** Raw local ISO time from the API, e.g. 2026-09-17T14:00 */
  time: string;
  /** Formatted in the CITY's own timezone, e.g. "2 PM" */
  label: string;
  /** Short day marker used when the forecast crosses midnight, e.g. "Fri" */
  dayLabel: string;
  isNow: boolean;
  isDay: boolean;
  temp: number;
  feelsLike: number;
  condition: WeatherCondition;
  icon: string;
  iconKind: WeatherIconKind;
  precipProb: number;
  rainfall: number;
  humidity: number;
  dewPoint: number;
  wind: number;
  windGust: number;
  windDirection: number;
  uvIndex: number;
  pressure: number;
}

export interface DayForecast {
  /** ISO date for the day, e.g. 2026-09-17 */
  date: string;
  isToday: boolean;
  day: string;
  dateLabel: string;
  tempMax: number;
  tempMin: number;
  condition: WeatherCondition;
  icon: string;
  iconKind: WeatherIconKind;
  rainProb: number;
  rainfall: number;
  windSpeed: number;
  windGust: number;
  humidity: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  daylight: string;
}

export interface WeatherAlert {
  id: string;
  severity: 'info' | 'advisory' | 'warning' | 'severe';
  icon: string;
  title: string;
  detail: string;
}

/** One hour of today's precipitation picture. */
export interface RainSlot {
  /** Local ISO time, e.g. 2026-09-17T14:00 */
  time: string;
  /** Formatted in the city's own timezone, e.g. "2 PM" */
  label: string;
  /** 0–23, city local time. */
  hour: number;
  precipProb: number;
  rainfall: number;
  condition: WeatherCondition;
  isPast: boolean;
  isNow: boolean;
}

/** A run of consecutive hours where rain is possible. */
export interface RainWindow {
  startTime: string;
  endTime: string;
  startLabel: string;
  endLabel: string;
  peakProb: number;
  totalRainfall: number;
  hours: number;
  isPast: boolean;
  isNow: boolean;
}

export interface RainOutlook {
  /** Every hour of the current local day, 00:00 → 23:00. */
  slots: RainSlot[];
  /** Consecutive runs where rain is possible, grouped for readability. */
  windows: RainWindow[];
  peakProb: number;
  totalRainfall: number;
  rainyHours: number;
  /** The next window that has not finished yet, if any. */
  nextWindow: RainWindow | null;
  currentlyRaining: boolean;
}

export interface WeatherData {
  city: string;
  country: string;
  countryCode: string;
  flag: string;
  lat: number;
  lng: number;
  timezone: string;
  timezoneAbbr: string;
  utcOffsetSeconds: number;
  /** Current wall-clock time at the city, formatted (e.g. "1:45 PM"). */
  localTime: string;
  /** Current wall-clock date at the city (e.g. "Thu, 17 Sep"). */
  localDate: string;
  /** Minutes since midnight in the city — used for the sun arc. */
  localMinutes: number;

  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  condition: WeatherCondition;
  icon: string;
  iconKind: WeatherIconKind;
  isDay: boolean;

  humidity: number;
  dewPoint: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  windDirectionText: string;
  visibility: number;
  pressure: number;
  pressureMsl: number;
  cloudCover: number;
  uvIndex: number;

  sunrise: string;
  sunset: string;
  sunriseMinutes: number;
  sunsetMinutes: number;
  solarNoon: string;
  dayLength: string;
  dayProgress: number;
  moonPhase: string;
  moonPhaseIcon: string;
  moonIllumination: number;

  rainProbability: number;
  rainfall: number;

  /** Full picture of today's rain, including hours that have already passed. */
  todayRain: RainOutlook;

  /**
   * true when the live API could not be reached and these figures are the
   * offline placeholder set — the UI says so rather than passing them off as
   * real weather.
   */
  isSample: boolean;

  hourly: HourlyForecast[];
  forecast: DayForecast[];
  alerts: WeatherAlert[];

  lastUpdated: string;
  lastUpdatedIso: string;
  fetchedAt: number;
}

export interface AirQualityData {
  aqi: number;
  category: string;
  /** 0..1 position of this reading on the 0-500 scale. */
  scale: number;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  so2: number;
  co: number;
  dominant: string;
  dominantValue: number;
}

/** Lightweight summary used by the city grid, map and search results. */
export interface CitySummary {
  city: City;
  temperature: number;
  feelsLike: number;
  condition: WeatherCondition;
  icon: string;
  iconKind: WeatherIconKind;
  isDay: boolean;
  tempMax: number;
  tempMin: number;
  humidity: number;
  windSpeed: number;
  rainProbability: number;
  aqi: number | null;
  aqiCategory: string | null;
  localTime: string;
}

export type TemperatureUnit = 'C' | 'F';
