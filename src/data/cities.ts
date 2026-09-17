import { City, Continent } from '../types/weather';

export const cities: City[] = [
  // Asia
  { name: 'Kolkata', country: 'India', countryCode: 'IN', flag: '🇮🇳', continent: 'Asia', lat: 22.5726, lng: 88.3639, timezone: 'Asia/Kolkata' },
  { name: 'Delhi', country: 'India', countryCode: 'IN', flag: '🇮🇳', continent: 'Asia', lat: 28.6139, lng: 77.209, timezone: 'Asia/Kolkata' },
  { name: 'Mumbai', country: 'India', countryCode: 'IN', flag: '🇮🇳', continent: 'Asia', lat: 19.076, lng: 72.8777, timezone: 'Asia/Kolkata' },
  { name: 'Bengaluru', country: 'India', countryCode: 'IN', flag: '🇮🇳', continent: 'Asia', lat: 12.9716, lng: 77.5946, timezone: 'Asia/Kolkata' },
  { name: 'Chennai', country: 'India', countryCode: 'IN', flag: '🇮🇳', continent: 'Asia', lat: 13.0827, lng: 80.2707, timezone: 'Asia/Kolkata' },
  { name: 'Tokyo', country: 'Japan', countryCode: 'JP', flag: '🇯🇵', continent: 'Asia', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo' },
  { name: 'Seoul', country: 'South Korea', countryCode: 'KR', flag: '🇰🇷', continent: 'Asia', lat: 37.5665, lng: 126.978, timezone: 'Asia/Seoul' },
  { name: 'Beijing', country: 'China', countryCode: 'CN', flag: '🇨🇳', continent: 'Asia', lat: 39.9042, lng: 116.4074, timezone: 'Asia/Shanghai' },
  { name: 'Shanghai', country: 'China', countryCode: 'CN', flag: '🇨🇳', continent: 'Asia', lat: 31.2304, lng: 121.4737, timezone: 'Asia/Shanghai' },
  { name: 'Singapore', country: 'Singapore', countryCode: 'SG', flag: '🇸🇬', continent: 'Asia', lat: 1.3521, lng: 103.8198, timezone: 'Asia/Singapore' },
  { name: 'Bangkok', country: 'Thailand', countryCode: 'TH', flag: '🇹🇭', continent: 'Asia', lat: 13.7563, lng: 100.5018, timezone: 'Asia/Bangkok' },
  { name: 'Jakarta', country: 'Indonesia', countryCode: 'ID', flag: '🇮🇩', continent: 'Asia', lat: -6.2088, lng: 106.8456, timezone: 'Asia/Jakarta' },
  { name: 'Dubai', country: 'UAE', countryCode: 'AE', flag: '🇦🇪', continent: 'Asia', lat: 25.2048, lng: 55.2708, timezone: 'Asia/Dubai' },
  { name: 'Riyadh', country: 'Saudi Arabia', countryCode: 'SA', flag: '🇸🇦', continent: 'Asia', lat: 24.7136, lng: 46.6753, timezone: 'Asia/Riyadh' },
  { name: 'Istanbul', country: 'Türkiye', countryCode: 'TR', flag: '🇹🇷', continent: 'Asia', lat: 41.0082, lng: 28.9784, timezone: 'Europe/Istanbul' },
  // Europe
  { name: 'London', country: 'United Kingdom', countryCode: 'GB', flag: '🇬🇧', continent: 'Europe', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London' },
  { name: 'Paris', country: 'France', countryCode: 'FR', flag: '🇫🇷', continent: 'Europe', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris' },
  { name: 'Berlin', country: 'Germany', countryCode: 'DE', flag: '🇩🇪', continent: 'Europe', lat: 52.52, lng: 13.405, timezone: 'Europe/Berlin' },
  { name: 'Rome', country: 'Italy', countryCode: 'IT', flag: '🇮🇹', continent: 'Europe', lat: 41.9028, lng: 12.4964, timezone: 'Europe/Rome' },
  { name: 'Madrid', country: 'Spain', countryCode: 'ES', flag: '🇪🇸', continent: 'Europe', lat: 40.4168, lng: -3.7038, timezone: 'Europe/Madrid' },
  { name: 'Amsterdam', country: 'Netherlands', countryCode: 'NL', flag: '🇳🇱', continent: 'Europe', lat: 52.3676, lng: 4.9041, timezone: 'Europe/Amsterdam' },
  { name: 'Vienna', country: 'Austria', countryCode: 'AT', flag: '🇦🇹', continent: 'Europe', lat: 48.2082, lng: 16.3738, timezone: 'Europe/Vienna' },
  { name: 'Zurich', country: 'Switzerland', countryCode: 'CH', flag: '🇨🇭', continent: 'Europe', lat: 47.3769, lng: 8.5417, timezone: 'Europe/Zurich' },
  { name: 'Moscow', country: 'Russia', countryCode: 'RU', flag: '🇷🇺', continent: 'Europe', lat: 55.7558, lng: 37.6173, timezone: 'Europe/Moscow' },
  { name: 'Lisbon', country: 'Portugal', countryCode: 'PT', flag: '🇵🇹', continent: 'Europe', lat: 38.7223, lng: -9.1393, timezone: 'Europe/Lisbon' },
  // North America
  { name: 'New York', country: 'United States', countryCode: 'US', flag: '🇺🇸', continent: 'North America', lat: 40.7128, lng: -74.006, timezone: 'America/New_York' },
  { name: 'Los Angeles', country: 'United States', countryCode: 'US', flag: '🇺🇸', continent: 'North America', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles' },
  { name: 'Chicago', country: 'United States', countryCode: 'US', flag: '🇺🇸', continent: 'North America', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago' },
  { name: 'San Francisco', country: 'United States', countryCode: 'US', flag: '🇺🇸', continent: 'North America', lat: 37.7749, lng: -122.4194, timezone: 'America/Los_Angeles' },
  { name: 'Toronto', country: 'Canada', countryCode: 'CA', flag: '🇨🇦', continent: 'North America', lat: 43.6532, lng: -79.3832, timezone: 'America/Toronto' },
  { name: 'Vancouver', country: 'Canada', countryCode: 'CA', flag: '🇨🇦', continent: 'North America', lat: 49.2827, lng: -123.1207, timezone: 'America/Vancouver' },
  { name: 'Mexico City', country: 'Mexico', countryCode: 'MX', flag: '🇲🇽', continent: 'North America', lat: 19.4326, lng: -99.1332, timezone: 'America/Mexico_City' },
  { name: 'Miami', country: 'United States', countryCode: 'US', flag: '🇺🇸', continent: 'North America', lat: 25.7617, lng: -80.1918, timezone: 'America/New_York' },
  { name: 'Houston', country: 'United States', countryCode: 'US', flag: '🇺🇸', continent: 'North America', lat: 29.7604, lng: -95.3698, timezone: 'America/Chicago' },
  { name: 'Washington D.C.', country: 'United States', countryCode: 'US', flag: '🇺🇸', continent: 'North America', lat: 38.9072, lng: -77.0369, timezone: 'America/New_York' },
  // South America
  { name: 'São Paulo', country: 'Brazil', countryCode: 'BR', flag: '🇧🇷', continent: 'South America', lat: -23.5505, lng: -46.6333, timezone: 'America/Sao_Paulo' },
  { name: 'Rio de Janeiro', country: 'Brazil', countryCode: 'BR', flag: '🇧🇷', continent: 'South America', lat: -22.9068, lng: -43.1729, timezone: 'America/Sao_Paulo' },
  { name: 'Buenos Aires', country: 'Argentina', countryCode: 'AR', flag: '🇦🇷', continent: 'South America', lat: -34.6037, lng: -58.3816, timezone: 'America/Argentina/Buenos_Aires' },
  { name: 'Lima', country: 'Peru', countryCode: 'PE', flag: '🇵🇪', continent: 'South America', lat: -12.0464, lng: -77.0428, timezone: 'America/Lima' },
  { name: 'Santiago', country: 'Chile', countryCode: 'CL', flag: '🇨🇱', continent: 'South America', lat: -33.4489, lng: -70.6693, timezone: 'America/Santiago' },
  // Africa
  { name: 'Cairo', country: 'Egypt', countryCode: 'EG', flag: '🇪🇬', continent: 'Africa', lat: 30.0444, lng: 31.2357, timezone: 'Africa/Cairo' },
  { name: 'Johannesburg', country: 'South Africa', countryCode: 'ZA', flag: '🇿🇦', continent: 'Africa', lat: -26.2041, lng: 28.0473, timezone: 'Africa/Johannesburg' },
  { name: 'Cape Town', country: 'South Africa', countryCode: 'ZA', flag: '🇿🇦', continent: 'Africa', lat: -33.9249, lng: 18.4241, timezone: 'Africa/Johannesburg' },
  { name: 'Nairobi', country: 'Kenya', countryCode: 'KE', flag: '🇰🇪', continent: 'Africa', lat: -1.2921, lng: 36.8219, timezone: 'Africa/Nairobi' },
  { name: 'Lagos', country: 'Nigeria', countryCode: 'NG', flag: '🇳🇬', continent: 'Africa', lat: 6.5244, lng: 3.3792, timezone: 'Africa/Lagos' },
  // Oceania
  { name: 'Sydney', country: 'Australia', countryCode: 'AU', flag: '🇦🇺', continent: 'Oceania', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney' },
  { name: 'Melbourne', country: 'Australia', countryCode: 'AU', flag: '🇦🇺', continent: 'Oceania', lat: -37.8136, lng: 144.9631, timezone: 'Australia/Melbourne' },
  { name: 'Brisbane', country: 'Australia', countryCode: 'AU', flag: '🇦🇺', continent: 'Oceania', lat: -27.4698, lng: 153.0251, timezone: 'Australia/Brisbane' },
  { name: 'Auckland', country: 'New Zealand', countryCode: 'NZ', flag: '🇳🇿', continent: 'Oceania', lat: -36.8485, lng: 174.7633, timezone: 'Pacific/Auckland' },
  { name: 'Perth', country: 'Australia', countryCode: 'AU', flag: '🇦🇺', continent: 'Oceania', lat: -31.9505, lng: 115.8605, timezone: 'Australia/Perth' },
];

export const defaultCity = cities[0]; // Kolkata

export const continents = ['Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania'] as const;

/** Rough continent lookup for cities that arrive from geocoding search. */
export function continentFromCoordinates(lat: number, lng: number): Continent {
  if (lat <= 12 && lng >= -82 && lng <= -34) return 'South America';
  if (lat >= 12 && lng >= -170 && lng <= -30) return 'North America';
  if (lng >= -25 && lng <= 60 && lat <= 37) return 'Africa';
  if (lng >= 110 || (lng <= -110 && lat < 0)) return 'Oceania';
  if (lat >= 35 && lng <= 45 && lng >= -25) return 'Europe';
  if (lng >= -30 && lng <= 60 && lat >= 35) return 'Europe';
  return 'Asia';
}

/** Ranked, case-insensitive search across the bundled city list. */
export function searchBundledCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = cities
    .map((city) => {
      const name = city.name.toLowerCase();
      const country = city.country.toLowerCase();
      let score = 0;
      if (name === q) score = 100;
      else if (name.startsWith(q)) score = 80;
      else if (name.includes(q)) score = 60;
      else if (country.startsWith(q)) score = 40;
      else if (country.includes(q)) score = 25;
      else if (city.countryCode.toLowerCase() === q) score = 30;
      return { city, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map((entry) => entry.city);
}

export function findBundledCity(name: string): City | undefined {
  const q = name.trim().toLowerCase();
  return cities.find((city) => city.name.toLowerCase() === q);
}
