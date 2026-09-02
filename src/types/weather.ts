export interface City {
  name: string;
  country: string;
  countryCode: string;
  flag: string;
  continent: Continent;
  lat: number;
  lng: number;
  timezone: string;
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

export interface HourlyForecast {
  hour: string;
  temp: number;
  condition: WeatherCondition;
  precipProb: number;
  rainfall: number;
  wind: number;
  icon: string;
}

export interface DayForecast {
  day: string;
  date: string;
  tempMax: number;
  tempMin: number;
  condition: WeatherCondition;
  icon: string;
  rainProb: number;
  rainfall: number;
  windSpeed: number;
  humidity: number;
}

export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  condition: WeatherCondition;
  icon: string;
  humidity: number;
  windSpeed: number;
  windGust: number;
  windDirection: number;
  windDirectionText: string;
  visibility: number;
  pressure: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  dayLength: string;
  rainProbability: number;
  rainfall: number;
  hourly: HourlyForecast[];
  forecast: DayForecast[];
  lastUpdated: string;
}

export interface AirQualityData {
  aqi: number;
  category: string;
  pm25: number;
  pm10: number;
  no2: number;
  o3: number;
  so2: number;
  co: number;
}

export type TemperatureUnit = 'C' | 'F';
