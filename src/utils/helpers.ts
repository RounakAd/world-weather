import {
  AirQualityData,
  RainOutlook,
  RainSlot,
  RainWindow,
  TemperatureUnit,
  WeatherAlert,
  WeatherCondition,
  WeatherData,
} from '../types/weather';

/* -------------------------------------------------------------------------- */
/*  Temperature                                                               */
/* -------------------------------------------------------------------------- */

export function convertTemp(celsius: number, unit: TemperatureUnit): number {
  if (unit === 'F') return Math.round((celsius * 9) / 5 + 32);
  return Math.round(celsius);
}

export function formatTemp(celsius: number, unit: TemperatureUnit): string {
  return `${convertTemp(celsius, unit)}°${unit}`;
}

/** Bare degrees, no unit suffix — used where the unit is shown elsewhere. */
export function formatTempBare(celsius: number, unit: TemperatureUnit): string {
  return `${convertTemp(celsius, unit)}°`;
}

export function formatTempValue(celsius: number, unit: TemperatureUnit): number {
  return convertTemp(celsius, unit);
}

/* -------------------------------------------------------------------------- */
/*  Time — always resolved in the city's own timezone                          */
/* -------------------------------------------------------------------------- */

export interface LocalClock {
  time: string;
  time24: string;
  date: string;
  weekday: string;
  minutes: number;
  iso: string;
}

/**
 * Converts "now" into wall-clock time for a city given its UTC offset.
 * Using the offset from the API means we never depend on the visitor's
 * browser timezone — every time on the page is the city's own local time.
 */
export function localClock(utcOffsetSeconds: number, at: Date = new Date()): LocalClock {
  const shifted = new Date(at.getTime() + utcOffsetSeconds * 1000);
  const hours = shifted.getUTCHours();
  const minutes = shifted.getUTCMinutes();
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][shifted.getUTCDay()];
  const month = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ][shifted.getUTCMonth()];

  return {
    time: `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`,
    time24: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
    date: `${month} ${shifted.getUTCDate()}`,
    weekday,
    minutes: hours * 60 + minutes,
    iso: `${shifted.getUTCFullYear()}-${(shifted.getUTCMonth() + 1).toString().padStart(2, '0')}-${shifted
      .getUTCDate()
      .toString()
      .padStart(2, '0')}`,
  };
}

/** Parses the API's offset-less local ISO strings without browser-tz drift. */
export function parseLocalIso(iso: string): { year: number; month: number; day: number; hour: number; minute: number } {
  const [datePart, timePart = '00:00'] = iso.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return { year, month, day, hour, minute };
}

export function formatHourLabel(iso: string): string {
  const { hour, minute } = parseLocalIso(iso);
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return minute === 0 ? `${hour12} ${ampm}` : `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

export function formatClockFromIso(iso: string): string {
  const { hour, minute } = parseLocalIso(iso);
  const hour12 = hour % 12 || 12;
  const ampm = hour >= 12 ? 'PM' : 'AM';
  return `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
}

export function minutesFromIso(iso: string): number {
  const { hour, minute } = parseLocalIso(iso);
  return hour * 60 + minute;
}

export function dayLabelFromIso(iso: string): string {
  const { year, month, day } = parseLocalIso(iso);
  const d = new Date(Date.UTC(year, month - 1, day));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
}

export function shortDateFromIso(iso: string): string {
  const { year, month, day } = parseLocalIso(iso);
  const d = new Date(Date.UTC(year, month - 1, day));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/** Renders a duration given in seconds as "12h 34m". */
export function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.round((total % 3600) / 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Math.max(0, Date.now() - then);
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins === 1) return '1 min ago';
  if (mins < 60) return `${mins} mins ago`;
  const hours = Math.round(mins / 60);
  return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
}

/* -------------------------------------------------------------------------- */
/*  Air quality                                                               */
/* -------------------------------------------------------------------------- */

export interface AQIBand {
  label: string;
  short: string;
  max: number;
  color: string;
  text: string;
}

export const AQI_BANDS: AQIBand[] = [
  { label: 'Good', short: 'Good', max: 50, color: '#22c55e', text: '#15803d' },
  { label: 'Moderate', short: 'Moderate', max: 100, color: '#eab308', text: '#a16207' },
  { label: 'Unhealthy for Sensitive Groups', short: 'Sensitive', max: 150, color: '#f97316', text: '#c2410c' },
  { label: 'Unhealthy', short: 'Unhealthy', max: 200, color: '#ef4444', text: '#b91c1c' },
  { label: 'Very Unhealthy', short: 'Very Unhealthy', max: 300, color: '#a855f7', text: '#7e22ce' },
  { label: 'Hazardous', short: 'Hazardous', max: 500, color: '#991b1b', text: '#7f1d1d' },
];

export function getAQICategory(aqi: number): string {
  return (AQI_BANDS.find((band) => aqi <= band.max) ?? AQI_BANDS[AQI_BANDS.length - 1]).label;
}

export function getAQIBand(aqi: number): AQIBand {
  return AQI_BANDS.find((band) => aqi <= band.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

export function getAQIColor(aqi: number): string {
  return getAQIBand(aqi).color;
}

export function getAQISummary(aqi: number): string {
  if (aqi <= 50) return 'Air quality is good. Perfect for outdoor activities.';
  if (aqi <= 100)
    return 'Air quality is moderate. Sensitive individuals should consider limiting prolonged outdoor exertion.';
  if (aqi <= 150)
    return 'Unhealthy for sensitive groups. Children, the elderly and those with respiratory conditions should reduce prolonged outdoor activity.';
  if (aqi <= 200)
    return 'Air quality is unhealthy. Everyone may begin to experience health effects — consider limiting outdoor activity.';
  if (aqi <= 300)
    return 'Very unhealthy. Health warnings of emergency conditions — avoid outdoor activities.';
  return 'Hazardous. Health alert: everyone may experience serious health effects. Stay indoors.';
}

/** Position (0..1) of an AQI reading on the 0-500 scale. */
export function getAQIScale(aqi: number): number {
  return Math.min(1, Math.max(0, aqi / 500));
}

/** Percentage of a pollutant relative to a reference "healthy" threshold. */
export function pollutantLoad(value: number, reference: number): number {
  if (!Number.isFinite(value) || reference <= 0) return 0;
  return Math.min(100, Math.round((value / reference) * 100));
}

export function getDominantPollutant(data: AirQualityData): { label: string; value: number } {
  const entries: Array<{ label: string; value: number; reference: number }> = [
    { label: 'PM2.5', value: data.pm25, reference: 15 },
    { label: 'PM10', value: data.pm10, reference: 45 },
    { label: 'NO₂', value: data.no2, reference: 25 },
    { label: 'O₃', value: data.o3, reference: 100 },
    { label: 'SO₂', value: data.so2, reference: 40 },
    { label: 'CO', value: data.co, reference: 4000 },
  ];
  const ranked = entries
    .map((entry) => ({ ...entry, load: entry.reference > 0 ? entry.value / entry.reference : 0 }))
    .sort((a, b) => b.load - a.load);
  return { label: ranked[0].label, value: ranked[0].value };
}

/* -------------------------------------------------------------------------- */
/*  Wind                                                                      */
/* -------------------------------------------------------------------------- */

const COMPASS_16 = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function getWindDirectionText(deg: number): string {
  return COMPASS_16[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
}

export function getWindDirectionLong(deg: number): string {
  const map: Record<string, string> = {
    N: 'North', NNE: 'North-Northeast', NE: 'Northeast', ENE: 'East-Northeast',
    E: 'East', ESE: 'East-Southeast', SE: 'Southeast', SSE: 'South-Southeast',
    S: 'South', SSW: 'South-Southwest', SW: 'Southwest', WSW: 'West-Southwest',
    W: 'West', WNW: 'West-Northwest', NW: 'Northwest', NNW: 'North-Northwest',
  };
  return map[getWindDirectionText(deg)] ?? 'North';
}

export function getBeaufortDescription(speedKmh: number): { scale: number; description: string } {
  if (speedKmh < 2) return { scale: 0, description: 'Calm' };
  if (speedKmh < 6) return { scale: 1, description: 'Light air' };
  if (speedKmh < 12) return { scale: 2, description: 'Light breeze' };
  if (speedKmh < 20) return { scale: 3, description: 'Gentle breeze' };
  if (speedKmh < 29) return { scale: 4, description: 'Moderate breeze' };
  if (speedKmh < 39) return { scale: 5, description: 'Fresh breeze' };
  if (speedKmh < 50) return { scale: 6, description: 'Strong breeze' };
  if (speedKmh < 62) return { scale: 7, description: 'Near gale' };
  if (speedKmh < 75) return { scale: 8, description: 'Gale' };
  if (speedKmh < 89) return { scale: 9, description: 'Strong gale' };
  if (speedKmh < 103) return { scale: 10, description: 'Storm' };
  if (speedKmh < 118) return { scale: 11, description: 'Violent storm' };
  return { scale: 12, description: 'Hurricane' };
}

/* -------------------------------------------------------------------------- */
/*  UV                                                                        */
/* -------------------------------------------------------------------------- */

export function getUVCategory(uv: number): { label: string; color: string; advice: string } {
  if (uv <= 2) return { label: 'Low', color: '#22c55e', advice: 'No protection needed.' };
  if (uv <= 5) return { label: 'Moderate', color: '#eab308', advice: 'Seek shade near midday.' };
  if (uv <= 7) return { label: 'High', color: '#f97316', advice: 'Sunscreen SPF 30+ recommended.' };
  if (uv <= 10) return { label: 'Very High', color: '#ef4444', advice: 'Extra protection — avoid midday sun.' };
  return { label: 'Extreme', color: '#a855f7', advice: 'Stay indoors during peak hours.' };
}

/* -------------------------------------------------------------------------- */
/*  Derived meteorology                                                       */
/* -------------------------------------------------------------------------- */

/** Magnus-formula dew point, computed client-side when the API value is absent. */
export function computeDewPoint(tempC: number, humidity: number): number {
  const a = 17.27;
  const b = 237.7;
  const alpha = (a * tempC) / (b + tempC) + Math.log(Math.max(1, humidity) / 100);
  return Math.round(((b * alpha) / (a - alpha)) * 10) / 10;
}

/** NWS heat index, valid for warm + humid conditions. */
export function computeHeatIndex(tempC: number, humidity: number): number {
  const t = (tempC * 9) / 5 + 32;
  if (t < 80) return Math.round(tempC);
  const r = humidity;
  let hi =
    -42.379 + 2.04901523 * t + 10.14333127 * r - 0.22475541 * t * r - 0.00683783 * t * t -
    0.05481717 * r * r + 0.00122874 * t * t * r + 0.00085282 * t * r * r - 0.00000199 * t * t * r * r;
  if (r < 13 && t >= 80 && t <= 112) hi -= ((13 - r) / 4) * Math.sqrt((17 - Math.abs(t - 95)) / 17);
  if (r > 85 && t >= 80 && t <= 87) hi += ((r - 85) / 10) * ((87 - t) / 5);
  return Math.round(((hi - 32) * 5) / 9);
}

export function computeWindChill(tempC: number, windKmh: number): number {
  if (tempC > 10 || windKmh < 4.8) return Math.round(tempC);
  const v = Math.pow(windKmh, 0.16);
  return Math.round(13.12 + 0.6215 * tempC - 11.37 * v + 0.3965 * tempC * v);
}

/** Moon phase from a standard synodic-month approximation. */
export function getMoonPhase(date: Date = new Date()): { name: string; icon: string; illumination: number } {
  const synodic = 29.530588853;
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14);
  const days = (date.getTime() - knownNewMoon) / 86400000;
  const age = ((days % synodic) + synodic) % synodic;
  const fraction = age / synodic;
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * fraction)) * 50);

  const phases: Array<{ limit: number; name: string; icon: string }> = [
    { limit: 0.0339, name: 'New Moon', icon: '🌑' },
    { limit: 0.2166, name: 'Waxing Crescent', icon: '🌒' },
    { limit: 0.2833, name: 'First Quarter', icon: '🌓' },
    { limit: 0.4666, name: 'Waxing Gibbous', icon: '🌔' },
    { limit: 0.5333, name: 'Full Moon', icon: '🌕' },
    { limit: 0.7166, name: 'Waning Gibbous', icon: '🌖' },
    { limit: 0.7833, name: 'Last Quarter', icon: '🌗' },
    { limit: 0.9666, name: 'Waning Crescent', icon: '🌘' },
  ];
  const match = phases.find((p) => fraction < p.limit);
  return match
    ? { name: match.name, icon: match.icon, illumination }
    : { name: 'New Moon', icon: '🌑', illumination };
}

/* -------------------------------------------------------------------------- */
/*  Colour scales                                                             */
/* -------------------------------------------------------------------------- */

/** Cold → hot colour ramp used by the map, the hourly strip and the charts. */
export function temperatureColor(tempC: number): string {
  const stops: Array<{ t: number; c: [number, number, number] }> = [
    { t: -20, c: [56, 108, 214] },
    { t: -5, c: [74, 158, 235] },
    { t: 5, c: [96, 200, 214] },
    { t: 15, c: [88, 200, 140] },
    { t: 22, c: [232, 197, 71] },
    { t: 30, c: [240, 138, 60] },
    { t: 38, c: [230, 76, 76] },
    { t: 48, c: [168, 40, 108] },
  ];
  if (tempC <= stops[0].t) return rgb(stops[0].c);
  if (tempC >= stops[stops.length - 1].t) return rgb(stops[stops.length - 1].c);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (tempC >= a.t && tempC <= b.t) {
      const ratio = (tempC - a.t) / (b.t - a.t);
      return rgb([
        Math.round(a.c[0] + (b.c[0] - a.c[0]) * ratio),
        Math.round(a.c[1] + (b.c[1] - a.c[1]) * ratio),
        Math.round(a.c[2] + (b.c[2] - a.c[2]) * ratio),
      ]);
    }
  }
  return rgb(stops[3].c);
}

function rgb([r, g, b]: [number, number, number]): string {
  return `rgb(${r}, ${g}, ${b})`;
}

/** Ambient sky palette, driven by theme, condition and time of day. */
export function skyPalette(
  condition: WeatherCondition,
  isDay: boolean,
  theme: 'light' | 'dark' = 'light',
): {
  sky1: string;
  sky2: string;
  sky3: string;
  glow: string;
  accent: string;
} {
  /* ------------------------------- dark theme ---------------------------- */
  if (theme === 'dark') {
    const dayLift = isDay ? 0.05 : 0;
    const base = (() => {
      switch (condition) {
        case 'Sunny':
        case 'Clear':
          return isDay
            ? { sky1: '#0a1230', sky2: '#131b45', sky3: '#1c1747', glow: 'rgba(251,191,36,0.24)', accent: '#fbbf24' }
            : { sky1: '#050818', sky2: '#0c1230', sky3: '#160f38', glow: 'rgba(129,140,248,0.3)', accent: '#818cf8' };
        case 'Partly Cloudy':
          return { sky1: '#080e24', sky2: '#111a3c', sky3: '#1a1642', glow: 'rgba(129,140,248,0.32)', accent: '#818cf8' };
        case 'Cloudy':
        case 'Overcast':
          return { sky1: '#080c18', sky2: '#111726', sky3: '#171d31', glow: 'rgba(100,116,139,0.3)', accent: '#94a3b8' };
        case 'Rain':
        case 'Heavy Rain':
        case 'Light Rain':
        case 'Drizzle':
          return { sky1: '#060b18', sky2: '#0d1730', sky3: '#131c3a', glow: 'rgba(56,189,248,0.28)', accent: '#60a5fa' };
        case 'Thunderstorm':
          return { sky1: '#05060f', sky2: '#0b1026', sky3: '#1a1038', glow: 'rgba(139,92,246,0.34)', accent: '#a78bfa' };
        case 'Snow':
          return { sky1: '#080e1c', sky2: '#131c33', sky3: '#1d2745', glow: 'rgba(186,230,253,0.28)', accent: '#93c5fd' };
        case 'Fog':
        case 'Haze':
          return { sky1: '#0a0d18', sky2: '#161a2b', sky3: '#20243a', glow: 'rgba(148,163,184,0.26)', accent: '#a5b4fc' };
        case 'Windy':
          return { sky1: '#06110f', sky2: '#0c1c1c', sky3: '#12252a', glow: 'rgba(45,212,191,0.26)', accent: '#2dd4bf' };
        default:
          return { sky1: '#070d22', sky2: '#101838', sky3: '#191440', glow: 'rgba(99,102,241,0.3)', accent: '#818cf8' };
      }
    })();
    void dayLift;
    return base;
  }

  /* ------------------------------ light theme ---------------------------- */
  if (!isDay) {
    if (condition === 'Thunderstorm')
      return { sky1: '#2a2b45', sky2: '#3b3a63', sky3: '#514876', glow: 'rgba(139,92,246,0.4)', accent: '#7c3aed' };
    if (condition === 'Rain' || condition === 'Heavy Rain' || condition === 'Drizzle' || condition === 'Light Rain')
      return { sky1: '#3a4a63', sky2: '#54688a', sky3: '#6f83a3', glow: 'rgba(56,189,248,0.38)', accent: '#2563eb' };
    if (condition === 'Snow')
      return { sky1: '#46536b', sky2: '#63708c', sky3: '#8291ac', glow: 'rgba(186,230,253,0.4)', accent: '#0284c7' };
    if (condition === 'Fog' || condition === 'Haze')
      return { sky1: '#4a5163', sky2: '#697083', sky3: '#8b91a1', glow: 'rgba(148,163,184,0.36)', accent: '#4f46e5' };
    return { sky1: '#1e2447', sky2: '#333a6b', sky3: '#4b4380', glow: 'rgba(99,102,241,0.42)', accent: '#6366f1' };
  }

  switch (condition) {
    case 'Sunny':
    case 'Clear':
      return { sky1: '#bfe3ff', sky2: '#ffe6c4', sky3: '#e8f4ff', glow: 'rgba(251,191,36,0.38)', accent: '#b45309' };
    case 'Partly Cloudy':
      return { sky1: '#c9e2ff', sky2: '#e6ecff', sky3: '#f4f0ff', glow: 'rgba(129,140,248,0.34)', accent: '#4f46e5' };
    case 'Cloudy':
    case 'Overcast':
      return { sky1: '#d3dced', sky2: '#e5e9f2', sky3: '#eef1f8', glow: 'rgba(100,116,139,0.3)', accent: '#475569' };
    case 'Rain':
    case 'Heavy Rain':
    case 'Light Rain':
    case 'Drizzle':
      return { sky1: '#bdd6ea', sky2: '#d7e6f2', sky3: '#e9f1f8', glow: 'rgba(56,189,248,0.34)', accent: '#0369a1' };
    case 'Thunderstorm':
      return { sky1: '#b9c2dd', sky2: '#d2d5ee', sky3: '#e4e2f5', glow: 'rgba(139,92,246,0.36)', accent: '#6d28d9' };
    case 'Snow':
      return { sky1: '#d8e9f7', sky2: '#eaf3fb', sky3: '#f6fbff', glow: 'rgba(147,197,253,0.36)', accent: '#0369a1' };
    case 'Fog':
    case 'Haze':
      return { sky1: '#dde3e8', sky2: '#e9edf1', sky3: '#f3f5f7', glow: 'rgba(148,163,184,0.34)', accent: '#475569' };
    case 'Windy':
      return { sky1: '#cfe3e6', sky2: '#e2f0ef', sky3: '#eff8f6', glow: 'rgba(45,212,191,0.34)', accent: '#0f766e' };
    default:
      return { sky1: '#c9e2ff', sky2: '#e6ecff', sky3: '#f4f0ff', glow: 'rgba(129,140,248,0.34)', accent: '#4f46e5' };
  }
}

/* -------------------------------------------------------------------------- */
/*  Narrative                                                                 */
/* -------------------------------------------------------------------------- */

export function generateWeatherSummary(data: WeatherData): string {
  const temp = data.temperature;
  const condition = data.condition.toLowerCase();
  const humidity = data.humidity;
  const wind = data.windSpeed;
  const rain = data.rainProbability;

  const tempDesc =
    temp >= 35 ? 'Hot' : temp >= 28 ? 'Warm' : temp >= 20 ? 'Pleasant' : temp >= 12 ? 'Cool' : 'Cold';
  const humidDesc = humidity >= 75 ? 'humid' : humidity >= 55 ? 'moderately humid' : 'dry';
  const windDesc = wind >= 30 ? 'strong winds' : wind >= 15 ? 'moderate winds' : 'light winds';

  let summary = `${tempDesc} and ${humidDesc} right now in ${data.city}, with ${condition} skies and ${windDesc}.`;

  if (rain >= 60) {
    summary += ` Expect significant rainfall — ${rain}% chance of precipitation.`;
  } else if (rain >= 30) {
    summary += ` Rain chances build through the day, peaking near ${rain}%.`;
  }

  if (data.uvIndex >= 8) summary += ' UV levels are very high, so protect your skin.';
  else if (data.uvIndex >= 6) summary += ' UV is high — sunscreen is a good idea.';

  if (data.temperature !== data.feelsLike && Math.abs(data.temperature - data.feelsLike) >= 3) {
    summary += ` It feels closer to ${data.feelsLike}°C once you factor in the wind and humidity.`;
  }

  return summary;
}

export function generateWeatherAdvice(data: WeatherData): Array<{ icon: string; text: string }> {
  const advice: Array<{ icon: string; text: string }> = [];

  if (data.rainProbability >= 40) advice.push({ icon: '☂️', text: 'Carry an umbrella' });
  if (data.uvIndex >= 6) advice.push({ icon: '🧴', text: 'Use sunscreen (SPF 30+)' });
  if (data.temperature < 15) advice.push({ icon: '🧥', text: 'Wear a warm jacket' });
  else if (data.temperature < 22) advice.push({ icon: '🧥', text: 'Light jacket recommended' });
  if (data.visibility < 5) advice.push({ icon: '🚗', text: 'Visibility may be reduced' });
  if (data.windSpeed >= 30) advice.push({ icon: '🌬️', text: 'Strong winds expected' });
  if (data.humidity >= 80 && data.temperature >= 30) advice.push({ icon: '💧', text: 'Stay hydrated — high heat index' });
  if (data.windGust >= 40) advice.push({ icon: '🌬️', text: `Wind gusts up to ${data.windGust} km/h` });
  if (data.pressure < 1000) advice.push({ icon: '📊', text: 'Low pressure system approaching' });
  if (data.temperature >= 32 && data.uvIndex >= 7) advice.push({ icon: '🕶️', text: 'Seek shade at midday' });
  if (data.humidity <= 30 && data.temperature >= 25) advice.push({ icon: '🥤', text: 'Dry air — drink extra water' });
  if (data.condition === 'Snow') advice.push({ icon: '🧣', text: 'Snow expected — dress in layers' });

  return advice.slice(0, 6);
}

/** Builds "notable weather" alerts from the live readings — no external feed needed. */
export function generateWeatherAlerts(data: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  if (data.windGust >= 60)
    alerts.push({
      id: 'wind',
      severity: 'severe',
      icon: '🌪️',
      title: 'Damaging wind gusts',
      detail: `Gusts reaching ${data.windGust} km/h — secure loose objects outdoors.`,
    });
  else if (data.windGust >= 40)
    alerts.push({
      id: 'wind',
      severity: 'warning',
      icon: '🌬️',
      title: 'Windy conditions',
      detail: `Gusts up to ${data.windGust} km/h expected.`,
    });

  if (data.temperature >= 40)
    alerts.push({
      id: 'heat',
      severity: 'severe',
      icon: '🔥',
      title: 'Extreme heat',
      detail: `Feels like ${data.feelsLike}°C — avoid prolonged sun exposure.`,
    });
  else if (data.temperature >= 35)
    alerts.push({
      id: 'heat',
      severity: 'warning',
      icon: '🥵',
      title: 'High heat',
      detail: `Temperatures around ${data.temperature}°C with a heat index near ${data.feelsLike}°C.`,
    });

  if (data.temperature <= 0)
    alerts.push({
      id: 'cold',
      severity: 'warning',
      icon: '🥶',
      title: 'Freezing conditions',
      detail: `Wind chill brings it down to ${computeWindChill(data.temperature, data.windSpeed)}°C.`,
    });

  if (data.condition === 'Thunderstorm')
    alerts.push({
      id: 'storm',
      severity: 'warning',
      icon: '⛈️',
      title: 'Thunderstorms nearby',
      detail: 'Lightning and heavy downpours possible — shelter indoors.',
    });

  if (data.rainProbability >= 80 && data.rainfall >= 5)
    alerts.push({
      id: 'rain',
      severity: 'advisory',
      icon: '🌧️',
      title: 'Heavy rain likely',
      detail: `${data.rainProbability}% chance with roughly ${data.rainfall} mm expected this hour.`,
    });

  if (data.visibility <= 2)
    alerts.push({
      id: 'visibility',
      severity: 'advisory',
      icon: '🌫️',
      title: 'Low visibility',
      detail: `Visibility down to ${data.visibility} km — drive with care.`,
    });

  if (data.uvIndex >= 11)
    alerts.push({
      id: 'uv',
      severity: 'warning',
      icon: '☀️',
      title: 'Extreme UV index',
      detail: `UV index of ${data.uvIndex} — unprotected skin can burn in minutes.`,
    });

  return alerts;
}

/* -------------------------------------------------------------------------- */
/*  Rain outlook                                                              */
/* -------------------------------------------------------------------------- */

/** Probability at or above which an hour counts as "might rain". */
export const RAIN_THRESHOLD = 30;

function isRainyHour(slot: RainSlot): boolean {
  return slot.precipProb >= RAIN_THRESHOLD || slot.rainfall > 0.1;
}

/**
 * Collapses today's hourly precipitation into the handful of windows a person
 * actually cares about — "4 PM to 7 PM" rather than three separate rows.
 */
export function buildRainOutlook(slots: RainSlot[]): RainOutlook {
  const windows: RainWindow[] = [];
  let run: RainSlot[] = [];

  const flush = () => {
    if (run.length === 0) return;
    windows.push({
      startTime: run[0].time,
      endTime: run[run.length - 1].time,
      startLabel: run[0].label,
      endLabel: run[run.length - 1].label,
      peakProb: Math.max(...run.map((slot) => slot.precipProb)),
      totalRainfall: Math.round(run.reduce((sum, slot) => sum + slot.rainfall, 0) * 10) / 10,
      hours: run.length,
      isPast: run.every((slot) => slot.isPast),
      isNow: run.some((slot) => slot.isNow),
    });
    run = [];
  };

  slots.forEach((slot) => {
    if (isRainyHour(slot)) run.push(slot);
    else flush();
  });
  flush();

  const rainySlots = slots.filter(isRainyHour);

  return {
    slots,
    windows,
    peakProb: slots.length ? Math.max(...slots.map((slot) => slot.precipProb)) : 0,
    totalRainfall: Math.round(slots.reduce((sum, slot) => sum + slot.rainfall, 0) * 10) / 10,
    rainyHours: rainySlots.length,
    nextWindow: windows.find((window) => !window.isPast) ?? null,
    currentlyRaining: slots.some((slot) => slot.isNow && isRainyHour(slot)),
  };
}

/* -------------------------------------------------------------------------- */
/*  Misc                                                                      */
/* -------------------------------------------------------------------------- */

export function flagFromCountryCode(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function debounce<T extends (...args: never[]) => unknown>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none)').matches;
}
