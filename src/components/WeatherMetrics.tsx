import { motion } from 'framer-motion';
import {
  Cloud,
  Droplets,
  Eye,
  Gauge,
  Sun,
  Thermometer,
  TrendingUp,
  Waves,
  Wind,
} from 'lucide-react';
import { WeatherData } from '../types/weather';
import { useWeatherContext } from '../context/WeatherContext';
import { convertTemp, getUVCategory } from '../utils/helpers';

interface WeatherMetricsProps {
  data: WeatherData;
}

export default function WeatherMetrics({ data }: WeatherMetricsProps) {
  const { unit } = useWeatherContext();
  const uv = getUVCategory(data.uvIndex);

  const metrics = [
    {
      icon: Droplets,
      label: 'Humidity',
      value: `${data.humidity}%`,
      subtext: data.humidity >= 70 ? 'High' : data.humidity >= 40 ? 'Comfortable' : 'Dry',
      color: 'text-blue-500',
    },
    {
      icon: Thermometer,
      label: 'Feels like',
      value: `${convertTemp(data.feelsLike, unit)}°${unit}`,
      subtext: Math.abs(data.feelsLike - data.temperature) >= 3 ? `${data.feelsLike > data.temperature ? 'Warmer' : 'Cooler'} than actual` : 'Matches actual',
      color: 'text-orange-500',
    },
    {
      icon: Wind,
      label: 'Wind speed',
      value: `${data.windSpeed} km/h`,
      subtext: `${data.windDirectionText} · ${data.windGust} km/h gusts`,
      color: 'text-cyan-500',
    },
    {
      icon: Waves,
      label: 'Dew point',
      value: `${data.dewPoint}°C`,
      subtext: data.dewPoint >= 20 ? 'Muggy' : data.dewPoint >= 13 ? 'Pleasant' : 'Crisp',
      color: 'text-teal-500',
    },
    {
      icon: Eye,
      label: 'Visibility',
      value: `${data.visibility} km`,
      subtext: data.visibility >= 10 ? 'Crystal clear' : data.visibility >= 5 ? 'Moderate' : 'Reduced',
      color: 'text-slate-500',
    },
    {
      icon: Gauge,
      label: 'Pressure',
      value: `${data.pressure} hPa`,
      subtext: data.pressure >= 1013 ? 'High / stable' : 'Low / unsettled',
      color: 'text-purple-500',
    },
    {
      icon: Sun,
      label: 'UV index',
      value: `${data.uvIndex}`,
      subtext: uv.label,
      color: 'text-amber-500',
      valueColor: uv.color,
    },
    {
      icon: Cloud,
      label: 'Cloud cover',
      value: `${data.cloudCover}%`,
      subtext: data.cloudCover >= 80 ? 'Overcast sky' : data.cloudCover >= 40 ? 'Partly cloudy' : 'Mostly clear',
      color: 'text-slate-400',
    },
    {
      icon: TrendingUp,
      label: 'Rain chance',
      value: `${data.rainProbability}%`,
      subtext: `${data.rainfall} mm this hour`,
      color: 'text-indigo-500',
    },
    {
      icon: Droplets,
      label: 'Pressure (MSL)',
      value: `${data.pressureMsl} hPa`,
      subtext: `Station ${data.pressure} hPa`,
      color: 'text-violet-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.035, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="glass-interactive group p-3.5 hover:-translate-y-1"
        >
          <div className="mb-2 flex items-center justify-between">
            <metric.icon className={metric.color} style={{ width: 18, height: 18 }} />
            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-faint">
              {metric.label}
            </span>
          </div>
          <div
            className="tabular font-display text-xl font-bold leading-tight text-slate-900 dark:text-white"
            style={metric.valueColor ? { color: metric.valueColor } : undefined}
          >
            {metric.value}
          </div>
          <div className="mt-0.5 truncate text-[10px] text-faint">{metric.subtext}</div>
        </motion.div>
      ))}
    </div>
  );
}
