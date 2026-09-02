import { WeatherData, AirQualityData, TemperatureUnit } from '../types/weather';

export function convertTemp(celsius: number, unit: TemperatureUnit): number {
  if (unit === 'F') return Math.round((celsius * 9) / 5 + 32);
  return celsius;
}

export function formatTemp(celsius: number, unit: TemperatureUnit): string {
  return `${convertTemp(celsius, unit)}°${unit}`;
}

export function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#eab308';
  if (aqi <= 150) return '#f97316';
  if (aqi <= 200) return '#ef4444';
  if (aqi <= 300) return '#a855f7';
  return '#7f1d1d';
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

export function generateWeatherSummary(data: WeatherData): string {
  const temp = data.temperature;
  const condition = data.condition.toLowerCase();
  const humidity = data.humidity;
  const wind = data.windSpeed;
  const rain = data.rainProbability;

  const tempDesc = temp >= 35 ? 'Hot' : temp >= 28 ? 'Warm' : temp >= 20 ? 'Pleasant' : temp >= 12 ? 'Cool' : 'Cold';
  const humidDesc = humidity >= 75 ? 'humid' : humidity >= 55 ? 'moderate humidity' : 'dry';
  const windDesc = wind >= 30 ? 'strong winds' : wind >= 15 ? 'moderate winds' : 'light winds';

  let summary = `${tempDesc} and ${humidDesc} today with ${condition} skies.`;

  if (rain >= 60) {
    summary += ` Expect significant rainfall with ${rain}% chance of precipitation.`;
  } else if (rain >= 30) {
    summary += ` Rain chances increase during the day, around ${rain}%.`;
  }

  if (wind >= 20) {
    summary += ` ${windDesc} expected throughout the day.`;
  }

  if (data.uvIndex >= 8) {
    summary += ' UV levels are very high — protect your skin.';
  }

  return summary;
}

export function generateWeatherAdvice(data: WeatherData): Array<{ icon: string; text: string }> {
  const advice: Array<{ icon: string; text: string }> = [];

  if (data.rainProbability >= 40) {
    advice.push({ icon: '☂️', text: 'Carry an umbrella' });
  }
  if (data.uvIndex >= 6) {
    advice.push({ icon: '🧴', text: 'Use sunscreen (SPF 30+)' });
  }
  if (data.temperature < 15) {
    advice.push({ icon: '🧥', text: 'Wear a warm jacket' });
  } else if (data.temperature < 22) {
    advice.push({ icon: '🧥', text: 'Light jacket recommended' });
  }
  if (data.visibility < 5) {
    advice.push({ icon: '🚗', text: 'Visibility may be reduced' });
  }
  if (data.windSpeed >= 30) {
    advice.push({ icon: '🌬️', text: 'Strong winds expected' });
  }
  if (data.humidity >= 80 && data.temperature >= 30) {
    advice.push({ icon: '💧', text: 'Stay hydrated — high heat index' });
  }
  if (data.windGust >= 40) {
    advice.push({ icon: '🌬️', text: 'Wind gusts up to ' + data.windGust + ' km/h' });
  }
  if (data.pressure < 1000) {
    advice.push({ icon: '📊', text: 'Low pressure system approaching' });
  }

  return advice.slice(0, 5);
}

export function getAQISummary(aqi: number): string {
  if (aqi <= 50) return 'Air quality is good. Perfect for outdoor activities.';
  if (aqi <= 100) return 'Air quality is moderate. Sensitive individuals should consider limiting prolonged outdoor exertion.';
  if (aqi <= 150) return 'Air quality is unhealthy for sensitive groups. Children, elderly, and those with respiratory conditions should reduce prolonged outdoor activity.';
  if (aqi <= 200) return 'Air quality is unhealthy. Everyone may begin to experience health effects. Consider limiting outdoor activity.';
  if (aqi <= 300) return 'Air quality is very unhealthy. Health warnings of emergency conditions. Avoid outdoor activities.';
  return 'Air quality is hazardous. Health alert: everyone may experience serious health effects. Stay indoors.';
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
