import { motion } from 'framer-motion';
import { Star, StarOff } from 'lucide-react';
import { City } from '../types/weather';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import { formatTemp } from '../utils/helpers';

interface CityCardProps {
  city: City;
  index: number;
}

export default function CityCard({ city, index }: CityCardProps) {
  const { setSelectedCity, unit, favorites, toggleFavorite } = useWeatherContext();
  const { data, loading } = useWeather(city);
  const isFavorite = favorites.includes(city.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="glass-card-hover p-4 cursor-pointer"
      onClick={() => setSelectedCity(city)}
    >
      {loading || !data ? (
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="h-5 w-5 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded mb-2" />
          <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded" />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900 dark:text-white">{city.name}</h3>
                <span>{city.flag}</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{city.country}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(city.name);
              }}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
              aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            >
              {isFavorite ? (
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              ) : (
                <StarOff className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>

          {/* Temperature and condition */}
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{data.icon}</span>
            <div>
              <div className="text-2xl font-bold text-slate-900 dark:text-white">
                {formatTemp(data.temperature, unit)}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{data.condition}</div>
            </div>
          </div>

          {/* High/Low */}
          <div className="flex gap-3 text-sm mb-3">
            <span className="text-slate-600 dark:text-slate-400">
              H: <span className="font-medium text-slate-900 dark:text-white">{formatTemp(data.tempMax, unit)}</span>
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              L: <span className="font-medium text-slate-900 dark:text-white">{formatTemp(data.tempMin, unit)}</span>
            </span>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>💨</span>
              <span>{data.windSpeed} km/h</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>💧</span>
              <span>{data.humidity}%</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>🌫</span>
              <span>AQI {data.rainProbability + 40}</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>🌧</span>
              <span>{data.rainProbability}%</span>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
