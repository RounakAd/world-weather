import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { City, CitySummary, TemperatureUnit } from '../types/weather';
import { cities, defaultCity, findBundledCity } from '../data/cities';
import { useCitySummaries } from '../hooks/useWeather';

interface WeatherContextType {
  selectedCity: City;
  setSelectedCity: (city: City) => void;
  /** Selects a city and scrolls the detail panel into view. */
  focusCity: (city: City) => void;

  unit: TemperatureUnit;
  setUnit: (unit: TemperatureUnit) => void;
  toggleUnit: () => void;

  theme: 'light' | 'dark';
  toggleTheme: () => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedContinent: string;
  setSelectedContinent: (continent: string) => void;

  favorites: string[];
  toggleFavorite: (cityName: string) => void;
  isFavorite: (cityName: string) => boolean;
  favoriteCities: City[];
  recentlyViewed: string[];
  recentCities: City[];
  addToRecentlyViewed: (cityName: string) => void;
  discoveredCities: City[];

  filteredCities: City[];
  summaries: Map<string, CitySummary>;
  summariesLoading: boolean;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

const STORAGE = {
  unit: 'weather-unit',
  theme: 'weather-theme',
  favorites: 'weather-favorites',
  recent: 'weather-recently-viewed',
  city: 'weather-selected-city',
  discovered: 'weather-discovered-cities',
};

function readStoredCity(): City {
  try {
    const saved = localStorage.getItem(STORAGE.city);
    if (saved) {
      const parsed = JSON.parse(saved) as City;
      if (parsed && typeof parsed.lat === 'number' && typeof parsed.lng === 'number') return parsed;
    }
  } catch {
    /* ignore malformed storage */
  }
  return defaultCity;
}

function readStoredTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem(STORAGE.theme);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

function readStoredUnit(): TemperatureUnit {
  try {
    const saved = localStorage.getItem(STORAGE.unit);
    if (saved === 'C' || saved === 'F') return saved;
  } catch {
    /* ignore */
  }
  return 'C';
}

function readStoredList(key: string): string[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

function readStoredCities(): City[] {
  try {
    const saved = localStorage.getItem(STORAGE.discovered);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed)
      ? (parsed as City[]).filter((city) => city && typeof city.lat === 'number')
      : [];
  } catch {
    return [];
  }
}

export function WeatherProvider({ children }: { children: ReactNode }) {
  /* State is hydrated lazily from storage. Doing this in an effect instead
     would let React StrictMode's double-invoked effects clobber the saved
     preference before it is ever applied. */
  const [selectedCity, setSelectedCityState] = useState<City>(() => readStoredCity());
  const [discoveredCities, setDiscoveredCities] = useState<City[]>(() => readStoredCities());
  const [unit, setUnitState] = useState<TemperatureUnit>(() => readStoredUnit());
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => readStoredTheme());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('All Cities');
  const [favorites, setFavorites] = useState<string[]>(() => readStoredList(STORAGE.favorites));
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>(() => readStoredList(STORAGE.recent));

  /* ------------------------------- theme -------------------------------- */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE.unit, unit);
  }, [unit]);

  useEffect(() => {
    localStorage.setItem(STORAGE.favorites, JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem(STORAGE.recent, JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  useEffect(() => {
    localStorage.setItem(STORAGE.discovered, JSON.stringify(discoveredCities.slice(0, 20)));
  }, [discoveredCities]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE.city, JSON.stringify(selectedCity));
    } catch {
      /* ignore quota errors */
    }
  }, [selectedCity]);

  /* ------------------------------ actions ------------------------------- */

  const addToRecentlyViewed = useCallback((cityName: string) => {
    setRecentlyViewed((prev) => [cityName, ...prev.filter((name) => name !== cityName)].slice(0, 12));
  }, []);

  const setSelectedCity = useCallback(
    (city: City) => {
      setSelectedCityState(city);
      addToRecentlyViewed(city.name);
      if (city.discovered) {
        setDiscoveredCities((prev) => {
          const exists = prev.some((c) => c.name === city.name && c.countryCode === city.countryCode);
          return exists ? prev : [city, ...prev].slice(0, 20);
        });
      }
    },
    [addToRecentlyViewed],
  );

  const focusCity = useCallback(
    (city: City) => {
      setSelectedCity(city);
      const target = document.getElementById('current-weather');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [setSelectedCity],
  );

  const setUnit = useCallback((next: TemperatureUnit) => setUnitState(next), []);
  const toggleUnit = useCallback(() => setUnitState((prev) => (prev === 'C' ? 'F' : 'C')), []);
  const toggleTheme = useCallback(() => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light')), []);

  const toggleFavorite = useCallback((cityName: string) => {
    setFavorites((prev) =>
      prev.includes(cityName) ? prev.filter((name) => name !== cityName) : [...prev, cityName],
    );
  }, []);

  const isFavorite = useCallback((cityName: string) => favorites.includes(cityName), [favorites]);

  /* ------------------------------ derived ------------------------------- */

  const allKnownCities = useMemo(() => {
    const merged = [...cities];
    discoveredCities.forEach((city) => {
      if (!merged.some((c) => c.name === city.name && c.countryCode === city.countryCode)) merged.push(city);
    });
    // Make sure a city restored from storage is always resolvable.
    if (!merged.some((c) => c.name === selectedCity.name && c.countryCode === selectedCity.countryCode)) {
      merged.push(selectedCity);
    }
    return merged;
  }, [discoveredCities, selectedCity]);

  const filteredCities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allKnownCities.filter((city) => {
      const matchesSearch =
        q === '' ||
        city.name.toLowerCase().includes(q) ||
        city.country.toLowerCase().includes(q) ||
        (city.admin1 ?? '').toLowerCase().includes(q);
      const matchesContinent = selectedContinent === 'All Cities' || city.continent === selectedContinent;
      return matchesSearch && matchesContinent;
    });
  }, [allKnownCities, searchQuery, selectedContinent]);

  const favoriteCities = useMemo(
    () => favorites.map((name) => allKnownCities.find((city) => city.name === name)).filter((c): c is City => !!c),
    [favorites, allKnownCities],
  );

  const recentCities = useMemo(
    () =>
      recentlyViewed
        .map((name) => allKnownCities.find((city) => city.name === name) ?? findBundledCity(name))
        .filter((c): c is City => !!c)
        .slice(0, 8),
    [recentlyViewed, allKnownCities],
  );

  const { summaries, loading: summariesLoading } = useCitySummaries(allKnownCities);

  const value: WeatherContextType = {
    selectedCity,
    setSelectedCity,
    focusCity,
    unit,
    setUnit,
    toggleUnit,
    theme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    selectedContinent,
    setSelectedContinent,
    favorites,
    toggleFavorite,
    isFavorite,
    favoriteCities,
    recentlyViewed,
    recentCities,
    addToRecentlyViewed,
    discoveredCities,
    filteredCities,
    summaries,
    summariesLoading,
  };

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeatherContext() {
  const context = useContext(WeatherContext);
  if (!context) throw new Error('useWeatherContext must be used within a WeatherProvider');
  return context;
}
