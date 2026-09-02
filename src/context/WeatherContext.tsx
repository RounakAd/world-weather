import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { City, TemperatureUnit } from '../types/weather';
import { cities, defaultCity } from '../data/cities';

interface WeatherContextType {
  selectedCity: City;
  setSelectedCity: (city: City) => void;
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
  recentlyViewed: string[];
  addToRecentlyViewed: (cityName: string) => void;
  filteredCities: City[];
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [selectedCity, setSelectedCityState] = useState<City>(defaultCity);
  const [unit, setUnitState] = useState<TemperatureUnit>('C');
  const [theme, setThemeState] = useState<'light' | 'dark'>('dark');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContinent, setSelectedContinent] = useState('All Cities');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([]);

  // Load preferences from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem('weather-unit') as TemperatureUnit | null;
    const savedTheme = localStorage.getItem('weather-theme') as 'light' | 'dark' | null;
    const savedFavorites = localStorage.getItem('weather-favorites');
    const savedRecentlyViewed = localStorage.getItem('weather-recently-viewed');

    if (savedUnit) setUnitState(savedUnit);
    if (savedTheme) setThemeState(savedTheme);
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
    if (savedRecentlyViewed) setRecentlyViewed(JSON.parse(savedRecentlyViewed));
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('weather-theme', theme);
  }, [theme]);

  // Save preferences
  useEffect(() => {
    localStorage.setItem('weather-unit', unit);
  }, [unit]);

  useEffect(() => {
    localStorage.setItem('weather-favorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('weather-recently-viewed', JSON.stringify(recentlyViewed));
  }, [recentlyViewed]);

  const setSelectedCity = useCallback((city: City) => {
    setSelectedCityState(city);
    addToRecentlyViewed(city.name);
  }, []);

  const setUnit = useCallback((u: TemperatureUnit) => {
    setUnitState(u);
  }, []);

  const toggleUnit = useCallback(() => {
    setUnitState((prev) => (prev === 'C' ? 'F' : 'C'));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const toggleFavorite = useCallback((cityName: string) => {
    setFavorites((prev) =>
      prev.includes(cityName)
        ? prev.filter((name) => name !== cityName)
        : [...prev, cityName]
    );
  }, []);

  const addToRecentlyViewed = useCallback((cityName: string) => {
    setRecentlyViewed((prev) => {
      const filtered = prev.filter((name) => name !== cityName);
      return [cityName, ...filtered].slice(0, 10);
    });
  }, []);

  // Filter cities based on search and continent
  const filteredCities = cities.filter((city) => {
    const matchesSearch =
      searchQuery === '' ||
      city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      city.country.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesContinent =
      selectedContinent === 'All Cities' || city.continent === selectedContinent;

    return matchesSearch && matchesContinent;
  });

  return (
    <WeatherContext.Provider
      value={{
        selectedCity,
        setSelectedCity,
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
        recentlyViewed,
        addToRecentlyViewed,
        filteredCities,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeatherContext() {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeatherContext must be used within a WeatherProvider');
  }
  return context;
}
