import { City, WeatherData, WeatherCondition, HourlyForecast, DayForecast, AirQualityData } from '../types/weather';

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

interface OpenMeteoResponse {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    surface_pressure: number;
    is_day: number;
  };
  hourly: {
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily: {
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
    weather_code: number[];
  };
}

interface OpenMeteoAQIResponse {
  current: {
    us_aqi: number;
    pm2_5: number;
    pm10: number;
    nitrogen_dioxide: number;
    ozone: number;
    sulphur_dioxide: number;
    carbon_monoxide: number;
  };
}

interface CacheEntry {
  data: unknown;
  timestamp: number;
}

class WeatherService {
  private cache = new Map<string, CacheEntry>();

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
      return entry.data as T;
    }
    return null;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private wmoToCondition(code: number): WeatherCondition {
    if (code === 0) return 'Clear';
    if (code === 1) return 'Sunny';
    if (code >= 2 && code <= 3) return 'Partly Cloudy';
    if (code === 45 || code === 48) return 'Fog';
    if (code >= 51 && code <= 55) return 'Drizzle';
    if (code >= 61 && code <= 65) return 'Rain';
    if (code >= 71 && code <= 77) return 'Snow';
    if (code >= 80 && code <= 82) return 'Rain';
    if (code >= 85 && code <= 86) return 'Snow';
    if (code === 95) return 'Thunderstorm';
    if (code >= 96 && code <= 99) return 'Thunderstorm';
    return 'Cloudy';
  }

  private getWeatherIcon(condition: WeatherCondition): string {
    const icons: Record<WeatherCondition, string> = {
      'Sunny': '☀️',
      'Clear': '🌙',
      'Partly Cloudy': '⛅',
      'Cloudy': '☁️',
      'Overcast': '🌥️',
      'Light Rain': '🌦️',
      'Rain': '🌧️',
      'Heavy Rain': '🌧️',
      'Thunderstorm': '⛈️',
      'Drizzle': '🌦️',
      'Snow': '❄️',
      'Fog': '🌫️',
      'Haze': '🌫️',
      'Windy': '💨',
    };
    return icons[condition] || '🌤️';
  }

  private getWindDirectionText(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  }

  private formatHour(hour: number): string {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  }

  async getWeather(city: City): Promise<WeatherData> {
    const cacheKey = `weather-${city.name}`;
    const cached = this.getCache<WeatherData>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        latitude: city.lat.toString(),
        longitude: city.lng.toString(),
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m,surface_pressure,is_day',
        hourly: 'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',
        daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,weather_code',
        timezone: 'auto',
        forecast_days: '7',
        wind_speed_unit: 'kmh',
      });

      const response = await fetch(`${OPEN_METEO_BASE}?${params}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);

      const data: OpenMeteoResponse = await response.json();
      const weatherData = this.parseWeatherData(city, data);
      this.setCache(cacheKey, weatherData);
      return weatherData;
    } catch (error) {
      console.error(`Failed to fetch weather for ${city.name}:`, error);
      return this.getFallbackWeather(city);
    }
  }

  private parseWeatherData(city: City, data: OpenMeteoResponse): WeatherData {
    const current = data.current;
    const hourly = data.hourly;
    const daily = data.daily;

    const weatherCode = current.weather_code;
    const condition = this.wmoToCondition(weatherCode);

    const now = new Date();
    const currentHour = now.getHours();

    const hourlyForecast: HourlyForecast[] = [];
    for (let i = 0; i < 24; i++) {
      const idx = (currentHour + i) % 24;
      const hourWeatherCode = hourly.weather_code[idx];
      hourlyForecast.push({
        hour: this.formatHour(idx),
        temp: Math.round(hourly.temperature_2m[idx]),
        condition: this.wmoToCondition(hourWeatherCode),
        precipProb: hourly.precipitation_probability[idx] || 0,
        rainfall: hourly.precipitation[idx] || 0,
        wind: Math.round(hourly.wind_speed_10m[idx]),
        icon: this.getWeatherIcon(this.wmoToCondition(hourWeatherCode)),
      });
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const forecast: DayForecast[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dailyWeatherCode = daily.weather_code[i];
      const dayCondition = this.wmoToCondition(dailyWeatherCode);

      forecast.push({
        day: dayNames[d.getDay()],
        date: `${monthNames[d.getMonth()]} ${d.getDate()}`,
        tempMax: Math.round(daily.temperature_2m_max[i]),
        tempMin: Math.round(daily.temperature_2m_min[i]),
        condition: dayCondition,
        icon: this.getWeatherIcon(dayCondition),
        rainProb: daily.precipitation_probability_max[i] || 0,
        rainfall: daily.precipitation_sum[i] || 0,
        windSpeed: Math.round(daily.wind_speed_10m_max[i]),
        humidity: Math.round(current.relative_humidity_2m),
      });
    }

    const sunriseStr = daily.sunrise[0];
    const sunsetStr = daily.sunset[0];
    const sunrise = this.formatTimeFromDate(new Date(sunriseStr));
    const sunset = this.formatTimeFromDate(new Date(sunsetStr));

    const sunriseDate = new Date(sunriseStr);
    const sunsetDate = new Date(sunsetStr);
    const dayLengthMs = sunsetDate.getTime() - sunriseDate.getTime();
    const dayLengthH = Math.floor(dayLengthMs / (1000 * 60 * 60));
    const dayLengthM = Math.floor((dayLengthMs % (1000 * 60 * 60)) / (1000 * 60));
    const dayLength = `${dayLengthH}h ${dayLengthM}m`;

    return {
      city: city.name,
      country: city.country,
      temperature: Math.round(current.temperature_2m),
      feelsLike: Math.round(current.apparent_temperature),
      tempMin: Math.round(daily.temperature_2m_min[0]),
      tempMax: Math.round(daily.temperature_2m_max[0]),
      condition,
      icon: this.getWeatherIcon(condition),
      humidity: Math.round(current.relative_humidity_2m),
      windSpeed: Math.round(current.wind_speed_10m),
      windGust: Math.round(current.wind_gusts_10m),
      windDirection: current.wind_direction_10m,
      windDirectionText: this.getWindDirectionText(current.wind_direction_10m),
      visibility: 10,
      pressure: Math.round(current.surface_pressure),
      uvIndex: Math.round(daily.uv_index_max[0]) || 0,
      sunrise,
      sunset,
      dayLength,
      rainProbability: hourly.precipitation_probability[currentHour] || 0,
      rainfall: hourly.precipitation[currentHour] || 0,
      hourly: hourlyForecast,
      forecast,
      lastUpdated: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  private formatTimeFromDate(date: Date): string {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }

  private getFallbackWeather(city: City): WeatherData {
    const fallbacks: Record<string, Partial<WeatherData>> = {
      'Kolkata': { temperature: 28, condition: 'Partly Cloudy', humidity: 78, uvIndex: 8 },
      'Delhi': { temperature: 32, condition: 'Haze', humidity: 55, uvIndex: 9 },
      'Tokyo': { temperature: 26, condition: 'Sunny', humidity: 65, uvIndex: 7 },
      'London': { temperature: 18, condition: 'Cloudy', humidity: 72, uvIndex: 4 },
      'New York': { temperature: 24, condition: 'Partly Cloudy', humidity: 60, uvIndex: 6 },
      'Sydney': { temperature: 18, condition: 'Sunny', humidity: 55, uvIndex: 5 },
      'Dubai': { temperature: 38, condition: 'Sunny', humidity: 40, uvIndex: 11 },
    };

    const fallback = fallbacks[city.name] || { temperature: 22, condition: 'Partly Cloudy', humidity: 60, uvIndex: 5 };
    const temp = fallback.temperature || 22;
    const cond = (fallback.condition as WeatherCondition) || 'Partly Cloudy';

    return {
      city: city.name,
      country: city.country,
      temperature: temp,
      feelsLike: temp + 2,
      tempMin: temp - 4,
      tempMax: temp + 3,
      condition: cond,
      icon: this.getWeatherIcon(cond),
      humidity: fallback.humidity || 60,
      windSpeed: 12,
      windGust: 20,
      windDirection: 180,
      windDirectionText: 'S',
      visibility: 10,
      pressure: 1013,
      uvIndex: fallback.uvIndex || 5,
      sunrise: '6:00 AM',
      sunset: '6:30 PM',
      dayLength: '12h 30m',
      rainProbability: 20,
      rainfall: 0,
      hourly: this.generateFallbackHourly(),
      forecast: this.generateFallbackForecast(temp),
      lastUpdated: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  }

  private generateFallbackHourly(): HourlyForecast[] {
    const forecast: HourlyForecast[] = [];
    for (let i = 0; i < 24; i++) {
      forecast.push({
        hour: this.formatHour(i),
        temp: Math.round(22 + Math.sin(i / 3) * 5),
        condition: 'Partly Cloudy',
        precipProb: Math.random() * 40,
        rainfall: 0,
        wind: 12,
        icon: '⛅',
      });
    }
    return forecast;
  }

  private generateFallbackForecast(baseTemp: number): DayForecast[] {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const forecast: DayForecast[] = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      forecast.push({
        day: dayNames[d.getDay()],
        date: `${monthNames[d.getMonth()]} ${d.getDate()}`,
        tempMax: Math.round(baseTemp + 3),
        tempMin: Math.round(baseTemp - 4),
        condition: 'Partly Cloudy',
        icon: '⛅',
        rainProb: Math.round(Math.random() * 50),
        rainfall: Math.round(Math.random() * 5 * 10) / 10,
        windSpeed: 12,
        humidity: 60,
      });
    }
    return forecast;
  }

  async getAirQuality(city: City): Promise<AirQualityData | null> {
    const cacheKey = `aqi-${city.name}`;
    const cached = this.getCache<AirQualityData>(cacheKey);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({
        latitude: city.lat.toString(),
        longitude: city.lng.toString(),
        current: 'us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide',
      });

      const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`);
      if (!response.ok) throw new Error(`AQI API error: ${response.status}`);

      const data: OpenMeteoAQIResponse = await response.json();
      const current = data.current;

      const aqiData: AirQualityData = {
        aqi: current.us_aqi || 50,
        category: this.getAQICategory(current.us_aqi || 50),
        pm25: Math.round((current.pm2_5 || 0) * 10) / 10,
        pm10: Math.round(current.pm10 || 0),
        no2: Math.round(current.nitrogen_dioxide || 0),
        o3: Math.round(current.ozone || 0),
        so2: Math.round(current.sulphur_dioxide || 0),
        co: Math.round(current.carbon_monoxide || 0),
      };

      this.setCache(cacheKey, aqiData);
      return aqiData;
    } catch (error) {
      console.error(`Failed to fetch AQI for ${city.name}:`, error);
      return null;
    }
  }

  private getAQICategory(aqi: number): string {
    if (aqi <= 50) return 'Good';
    if (aqi <= 100) return 'Moderate';
    if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
    if (aqi <= 200) return 'Unhealthy';
    if (aqi <= 300) return 'Very Unhealthy';
    return 'Hazardous';
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const weatherService = new WeatherService();
