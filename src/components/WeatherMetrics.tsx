import { motion } from 'framer-motion';
import { Droplets, Wind, Eye, Sun, Gauge, TrendingUp, Clock } from 'lucide-react';
import { WeatherData } from '../types/weather';
import { useWeatherContext } from '../context/WeatherContext';
import { formatTemp } from '../utils/helpers';

interface WeatherMetricsProps {
  data: WeatherData;
}

export default function WeatherMetrics({ data }: WeatherMetricsProps) {
  const { unit } = useWeatherContext();

  const metrics = [
    {
      icon: Droplets,
      label: 'Humidity',
      value: `${data.humidity}%`,
      subtext: data.humidity >= 70 ? 'High' : data.humidity >= 40 ? 'Normal' : 'Low',
      color: 'text-blue-500',
    },
    {
      icon: Wind,
      label: 'Wind Speed',
      value: `${data.windSpeed} km/h`,
      subtext: `${data.windGust} km/h gusts`,
      color: 'text-cyan-500',
    },
    {
      icon: Eye,
      label: 'Visibility',
      value: `${data.visibility} km`,
      subtext: data.visibility >= 10 ? 'Clear' : data.visibility >= 5 ? 'Moderate' : 'Poor',
      color: 'text-slate-500',
    },
    {
      icon: Gauge,
      label: 'Pressure',
      value: `${data.pressure} hPa`,
      subtext: data.pressure >= 1013 ? 'Normal' : 'Low',
      color: 'text-purple-500',
    },
    {
      icon: Sun,
      label: 'UV Index',
      value: data.uvIndex.toString(),
      subtext: data.uvIndex >= 8 ? 'Very High' : data.uvIndex >= 6 ? 'High' : data.uvIndex >= 3 ? 'Moderate' : 'Low',
      color: 'text-amber-500',
    },
    {
      icon: TrendingUp,
      label: 'Rain Chance',
      value: `${data.rainProbability}%`,
      subtext: `${data.rainfall} mm expected`,
      color: 'text-indigo-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="glass-card-hover p-4 flex flex-col items-center text-center"
        >
          <metric.icon className={`w-6 h-6 ${metric.color} mb-2`} />
          <div className="text-lg font-bold text-slate-900 dark:text-white">{metric.value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{metric.label}</div>
          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{metric.subtext}</div>
        </motion.div>
      ))}
    </div>
  );
}
