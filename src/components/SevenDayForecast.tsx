import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Wind, Droplets } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';

export default function SevenDayForecast() {
  const { selectedCity, unit } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  if (loading || !data) {
    return (
      <div className="glass-card p-4 mb-6">
        <div className="animate-pulse">
          <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
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
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">7-Day Forecast</h3>
      <div className="space-y-2">
        {data.forecast.map((day, index) => (
          <motion.div
            key={day.day}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <button
              onClick={() => setExpandedDay(expandedDay === index ? null : index)}
              className={`w-full glass-card-hover p-4 flex items-center justify-between ${
                expandedDay === index ? 'border-indigo-500' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium w-12 text-slate-600 dark:text-slate-400">
                  {index === 0 ? 'Today' : day.day}
                </span>
                <span className="text-2xl">{day.icon}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 w-24 text-left">
                  {day.condition}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden sm:flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-blue-500">
                    <Droplets className="w-3 h-3" />
                    {day.rainProb}%
                  </span>
                  {day.rainfall > 0 && (
                    <span className="text-slate-500">{day.rainfall}mm</span>
                  )}
                </div>
                <div className="flex items-center gap-3 font-medium">
                  <span className="text-slate-900 dark:text-white">
                    {formatTemp(day.tempMax)}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {formatTemp(day.tempMin)}
                  </span>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform ${
                    expandedDay === index ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {expandedDay === index && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 pt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2">
                      <Wind className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Wind</span>
                      <span className="text-sm font-medium ml-auto">{day.windSpeed} km/h</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">Humidity</span>
                      <span className="text-sm font-medium ml-auto">{day.humidity}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Rainfall</span>
                      <span className="text-sm font-medium ml-auto">{day.rainfall} mm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Rain Chance</span>
                      <span className="text-sm font-medium ml-auto">{day.rainProb}%</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
