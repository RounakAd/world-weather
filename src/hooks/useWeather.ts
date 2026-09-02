import { useState, useEffect, useCallback } from 'react';
import { City, WeatherData, AirQualityData } from '../types/weather';
import { weatherService } from '../services/weatherService';

interface UseWeatherResult {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWeather(city: City | null): UseWeatherResult {
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async () => {
    if (!city) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const weatherData = await weatherService.getWeather(city);
      setData(weatherData);
    } catch (err) {
      setError('Failed to load weather data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [city]);

  useEffect(() => {
    fetchWeather();
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

  useEffect(() => {
    if (!city) {
      setData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    weatherService.getAirQuality(city)
      .then((aqiData) => {
        setData(aqiData);
        setLoading(false);
      })
      .catch((err) => {
        setError('Failed to load air quality data');
        setLoading(false);
        console.error(err);
      });
  }, [city]);

  return { data, loading, error };
}
