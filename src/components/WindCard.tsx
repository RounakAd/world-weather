import { motion } from 'framer-motion';
import { Wind, Gauge, Navigation } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import { getBeaufortDescription } from '../utils/helpers';

export default function WindCard() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  if (loading || !data) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="flex items-center justify-center h-32">
            <div className="w-20 h-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  const beaufort = getBeaufortDescription(data.windSpeed);

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Wind className="w-5 h-5" />
        Wind
      </h3>

      <div className="flex items-center justify-between">
        {/* Compass */}
        <div className="relative w-32 h-32">
          {/* Compass ring */}
          <svg className="w-full h-full" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className="text-slate-200 dark:text-slate-700"
            />
            {/* Direction markers */}
            {['N', 'E', 'S', 'W'].map((dir, i) => {
              const angle = i * 90 - 90;
              const rad = (angle * Math.PI) / 180;
              const x = 50 + 40 * Math.sin(rad);
              const y = 50 - 40 * Math.cos(rad);
              return (
                <text
                  key={dir}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs fill-slate-400 dark:fill-slate-500 font-medium"
                >
                  {dir}
                </text>
              );
            })}
          </svg>

          {/* Animated wind arrow */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ rotate: data.windDirection }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          >
            <Navigation className="w-10 h-10 text-indigo-500" />
          </motion.div>
        </div>

        {/* Wind details */}
        <div className="text-right">
          <div className="text-3xl font-bold text-slate-900 dark:text-white">
            {data.windSpeed}
            <span className="text-sm font-normal text-slate-500 ml-1">km/h</span>
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {data.windDirectionText} {data.windDirection}°
          </div>
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Gusts: {data.windGust} km/h
          </div>
        </div>
      </div>

      {/* Beaufort scale */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-600 dark:text-slate-400">Beaufort Scale</span>
          </div>
          <span className="text-sm font-semibold text-slate-900 dark:text-white">
            {beaufort.scale} - {beaufort.description}
          </span>
        </div>
        {/* Beaufort bar */}
        <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 to-red-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(beaufort.scale / 12) * 100}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}
