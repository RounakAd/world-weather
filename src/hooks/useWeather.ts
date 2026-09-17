import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AirQualityData, City, CitySummary, WeatherData } from '../types/weather';
import { weatherService } from '../services/weatherService';
import { searchBundledCities } from '../data/cities';
import { localClock } from '../utils/helpers';

interface UseWeatherResult {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/** Full weather detail for one city, refreshed automatically every 10 minutes. */
export function useWeather(city: City | null): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const fetchWeather = useCallback(async () => {
    if (!city) {
      setData(null);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const weatherData = await weatherService.getWeather(city);
      if (id !== requestId.current) return;
      setData(weatherData);
    } catch (err) {
      if (id !== requestId.current) return;
      setError('Failed to load weather data');
      console.error(err);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  useEffect(() => {
    const timer = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [fetchWeather]);

  return { data, loading, error, refetch: fetchWeather };
}

interface UseAirQualityResult {
  data: AirQualityData | null;
  loading: boolean;
  error: string | null;
}

export function useAirQuality(city: City | null): UseAirQualityResult {
  const [data, setData] = useState<AirQualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  useEffect(() => {
    if (!city) {
      setData(null);
      setLoading(false);
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    weatherService
      .getAirQuality(city)
      .then((aqiData) => {
        if (id !== requestId.current) return;
        setData(aqiData);
        setLoading(false);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setError('Failed to load air quality data');
        setLoading(false);
        console.error(err);
      });
  }, [city]);

  return { data, loading, error };
}

interface UseCitySummariesResult {
  summaries: Map<string, CitySummary>;
  loading: boolean;
}

/**
 * Batched summaries for the whole city list — two network requests total
 * (weather + air quality) instead of one hundred.
 */
export function useCitySummaries(list: City[]): UseCitySummariesResult {
  const [summaries, setSummaries] = useState<Map<string, CitySummary>>(new Map());
  const [loading, setLoading] = useState(true);

  const key = useMemo(() => list.map((city) => city.name).join('|'), [list]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const weatherMap = await weatherService.getCitySummaries(list);
        if (cancelled) return;
        setSummaries(new Map(weatherMap));
        setLoading(false);

        // AQI is a second pass so a slow air-quality response never blocks the grid.
        await weatherService.getAirQualityBatch(list);
        if (cancelled) return;
        setSummaries(weatherService.attachAirQuality(weatherMap));
      } catch (error) {
        console.error('Failed to load city summaries:', error);
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { summaries, loading };
}

interface UseCitySearchResult {
  results: City[];
  loading: boolean;
  remote: boolean;
}

/**
 * City search: instant matches from the bundled list, then live geocoding
 * results (any city on earth) once the query settles.
 */
export function useCitySearch(query: string, open: boolean): UseCitySearchResult {
  const [remoteResults, setRemoteResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [remote, setRemote] = useState(false);

  const localResults = useMemo(() => (open ? searchBundledCities(query, 7) : []), [query, open]);

  useEffect(() => {
    if (!open || query.trim().length < 3) {
      setRemoteResults([]);
      setLoading(false);
      setRemote(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      const found = await weatherService.searchCities(query, 6);
      if (cancelled) return;
      const localNames = new Set(localResults.map((city) => `${city.name}|${city.countryCode}`));
      const filtered = found.filter((city) => !localNames.has(`${city.name}|${city.countryCode}`));
      setRemoteResults(filtered);
      setRemote(filtered.length > 0);
      setLoading(false);
    }, 320);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, localResults]);

  const results = useMemo(() => [...localResults, ...remoteResults].slice(0, 10), [localResults, remoteResults]);

  return { results, loading, remote };
}

/** Ticking wall clock for a city, so "local time" stays live. */
export function useLocalClock(utcOffsetSeconds: number | undefined, enabled = true): ReturnType<typeof localClock> {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [enabled]);

  return useMemo(() => localClock(utcOffsetSeconds ?? 0, now), [utcOffsetSeconds, now]);
}
