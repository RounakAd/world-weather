import { motion } from 'framer-motion';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';

export default function HourlyForecast() {
  const { selectedCity, unit } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  if (loading || !data) {
    return (
      <div className="glass-card p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="flex gap-3 overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-16 h-24 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatTemp = (celsius: number) => {
    if (unit === 'F') return `${Math.round((celsius * 9) / 5 + 32)}°`;
    return `${celsius}°`;
  };

  return (
    <div className="glass-card p-4 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Hourly Forecast</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {data.hourly.map((hour, index) => (
          <motion.div
            key={hour.hour}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`flex-shrink-0 glass-card-hover p-3 flex flex-col items-center min-w-[72px] ${
              index === 0 ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30' : ''
            }`}
          >
            <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">
              {index === 0 ? 'Now' : hour.hour}
            </span>
            <span className="text-2xl">{hour.icon}</span>
            <span className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
              {formatTemp(hour.temp)}
            </span>
            {hour.precipProb > 0 && (
              <span className="text-xs text-blue-500 mt-1">{hour.precipProb}%</span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
