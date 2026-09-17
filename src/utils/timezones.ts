/**
 * World-clock helpers.
 *
 * Offsets are resolved through the browser's IANA timezone database rather than
 * being hardcoded, so every clock shows the correct *current* wall time —
 * including daylight saving. In September, New York is on EDT (UTC−4) and London
 * on BST (UTC+1); a hardcoded −5 / +0 would put both clocks an hour wrong.
 */

export interface WorldZone {
  /** IANA timezone identifier. */
  id: string;
  /** Short label, as commonly written (EST, IST, JST …). */
  label: string;
  /** Full name of the standard time. */
  name: string;
  /** Representative cities. */
  cities: string;
  flag: string;
  /** Standard offset in minutes, for comparison against the live offset. */
  standardOffset: number;
}

/** The ten reference zones, in the order they should be displayed. */
export const WORLD_ZONES: WorldZone[] = [
  {
    id: 'UTC',
    label: 'UTC',
    name: 'Coordinated Universal Time',
    cities: 'Global timekeeping reference',
    flag: '🌐',
    standardOffset: 0,
  },
  {
    id: 'America/New_York',
    label: 'EST',
    name: 'Eastern Time',
    cities: 'New York · Washington D.C. · Toronto',
    flag: '🇺🇸',
    standardOffset: -300,
  },
  {
    id: 'America/Los_Angeles',
    label: 'PST',
    name: 'Pacific Time',
    cities: 'Los Angeles · San Francisco · Vancouver',
    flag: '🇺🇸',
    standardOffset: -480,
  },
  {
    id: 'Europe/Berlin',
    label: 'CET',
    name: 'Central European Time',
    cities: 'Berlin · Paris · Rome · Madrid',
    flag: '🇩🇪',
    standardOffset: 60,
  },
  {
    id: 'Asia/Kolkata',
    label: 'IST',
    name: 'India Standard Time',
    cities: 'Mumbai · Delhi · Bengaluru · Colombo',
    flag: '🇮🇳',
    standardOffset: 330,
  },
  {
    id: 'Asia/Tokyo',
    label: 'JST',
    name: 'Japan Standard Time',
    cities: 'Tokyo · Osaka · Yokohama',
    flag: '🇯🇵',
    standardOffset: 540,
  },
  {
    id: 'Australia/Sydney',
    label: 'AEST',
    name: 'Australian Eastern Time',
    cities: 'Sydney · Melbourne · Brisbane',
    flag: '🇦🇺',
    standardOffset: 600,
  },
  {
    id: 'Asia/Shanghai',
    label: 'CST',
    name: 'China Standard Time',
    cities: 'Beijing · Shanghai · Hong Kong, China',
    flag: '🇨🇳',
    standardOffset: 480,
  },
  {
    id: 'America/Denver',
    label: 'MST',
    name: 'Mountain Time',
    cities: 'Denver · Calgary · Phoenix',
    flag: '🇺🇸',
    standardOffset: -420,
  },
  {
    id: 'Europe/London',
    label: 'GMT',
    name: 'Greenwich Mean Time',
    cities: 'London · Dublin · Accra',
    flag: '🇬🇧',
    standardOffset: 0,
  },
];

export interface ZonedTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday. */
  weekday: number;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string): Intl.DateTimeFormat {
  let dtf = partsCache.get(timeZone);
  if (!dtf) {
    dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partsCache.set(timeZone, dtf);
  }
  return dtf;
}

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock time in an IANA zone, broken into numbers. */
export function zonedTime(date: Date, timeZone: string): ZonedTime {
  const parts = formatter(timeZone).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';

  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    // Intl can emit "24" for midnight with hour12: false.
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAYS[get('weekday')] ?? 0,
  };
}

/** Live UTC offset of a zone in minutes, including any daylight saving shift. */
export function zoneOffsetMinutes(date: Date, timeZone: string): number {
  if (timeZone === 'UTC') return 0;
  const z = zonedTime(date, timeZone);
  const asUtc = Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
  // Compare whole seconds to avoid sub-second rounding noise.
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000);
}

/** Standard (winter) offset for a zone, derived from the smaller of Jan/Jul. */
export function standardOffsetMinutes(date: Date, timeZone: string): number {
  if (timeZone === 'UTC') return 0;
  const year = date.getUTCFullYear();
  const jan = zoneOffsetMinutes(new Date(Date.UTC(year, 0, 1, 12)), timeZone);
  const jul = zoneOffsetMinutes(new Date(Date.UTC(year, 6, 1, 12)), timeZone);
  return Math.min(jan, jul);
}

/** True when the zone is currently observing daylight saving time. */
export function isDaylightSaving(date: Date, timeZone: string): boolean {
  if (timeZone === 'UTC') return false;
  return zoneOffsetMinutes(date, timeZone) > standardOffsetMinutes(date, timeZone);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "UTC+05:30" / "UTC−04:00" — typographic minus for readability. */
export function formatOffset(minutes: number): string {
  const sign = minutes < 0 ? '\u2212' : '+';
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/** "3:25:41 PM" */
export function formatTime12(hour: number, minute: number, second?: number): string {
  const h12 = hour % 12 || 12;
  const mm = minute.toString().padStart(2, '0');
  const base = `${h12}:${mm}`;
  const withSeconds = second === undefined ? base : `${base}:${second.toString().padStart(2, '0')}`;
  return `${withSeconds} ${hour >= 12 ? 'PM' : 'AM'}`;
}

/** "Wednesday, 17 Sep" */
export function formatLongDate(z: ZonedTime): string {
  return `${WEEKDAY_LONG[z.weekday]}, ${z.day} ${MONTHS[z.month - 1]}`;
}

/** "Wed 17 Sep" */
export function formatShortDate(z: ZonedTime): string {
  return `${WEEKDAY_SHORT[z.weekday]} ${z.day} ${MONTHS[z.month - 1]}`;
}

/** Hour / minute / second hand angles in degrees, accounting for carry-over. */
export function clockAngles(z: ZonedTime): { hour: number; minute: number; second: number } {
  return {
    second: z.second * 6,
    minute: (z.minute + z.second / 60) * 6,
    hour: ((z.hour % 12) + z.minute / 60 + z.second / 3600) * 30,
  };
}
