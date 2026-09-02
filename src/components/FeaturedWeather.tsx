import { motion } from 'framer-motion';
import { Droplets, Wind, Eye, Sun, Gauge, RefreshCw } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import { formatTemp } from '../utils/helpers';
import WeatherMetrics from './WeatherMetrics';
import HourlyForecast from './HourlyForecast';
import SevenDayForecast from './SevenDayForecast';

export default function FeaturedWeather() {
  const { selectedCity, unit, theme } = useWeatherContext();
  const { data, loading, error, refetch } = useWeather(selectedCity);

  if (loading) {
    return (
      <section className="pt-4 pb-8 px-4">
        <div className="max-w-5xl mx-auto">
          <FeaturedSkeleton />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="pt-4 pb-8 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="glass-card p-8">
            <p className="text-slate-600 dark:text-slate-400 mb-4">Unable to load weather data</p>
            <button onClick={refetch} className="btn-primary flex items-center gap-2 mx-auto">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-4 pb-8 px-4">
      <div className="max-w-5xl mx-auto">
        <motion.div
          key={selectedCity.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Main weather card */}
          <div className={`glass-card p-6 md:p-8 mb-6 relative overflow-hidden ${
            theme === 'dark' ? 'dark:bg-slate-900/70' : 'bg-white/70'
          }`}>
            {/* Weather background gradient */}
            <div className={`absolute inset-0 opacity-30 ${
              data.condition.includes('Sunny') || data.condition === 'Clear'
                ? 'bg-gradient-to-br from-amber-200 to-orange-300'
                : data.condition.includes('Rain')
                ? 'bg-gradient-to-br from-blue-200 to-cyan-300'
                : data.condition.includes('Cloud')
                ? 'bg-gradient-to-br from-slate-200 to-gray-300'
                : 'bg-gradient-to-br from-indigo-200 to-purple-300'
            }`} />

            <div className="relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    {data.city}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">{data.country}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    Last updated: {data.lastUpdated}
                  </div>
                </div>
              </div>

              {/* Main temperature display */}
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 mb-8">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-9xl md:text-[10rem] leading-none"
                >
                  {data.icon}
                </motion.div>
                <div className="text-center md:text-left">
                  <div className="text-7xl md:text-8xl font-bold text-slate-900 dark:text-white">
                    {formatTemp(data.temperature, unit)}
                  </div>
                  <div className="text-xl text-slate-600 dark:text-slate-300 mt-2">
                    {data.condition}
                  </div>
                  <div className="text-slate-500 dark:text-slate-400 mt-1">
                    Feels like {formatTemp(data.feelsLike, unit)}
                  </div>
                </div>
              </div>

              {/* High/Low */}
              <div className="flex justify-center md:justify-start gap-6 mb-6">
                <div className="text-lg">
                  <span className="text-slate-500 dark:text-slate-400">H: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatTemp(data.tempMax, unit)}
                  </span>
                </div>
                <div className="text-lg">
                  <span className="text-slate-500 dark:text-slate-400">L: </span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatTemp(data.tempMin, unit)}
                  </span>
                </div>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricBadge icon={Droplets} label="Humidity" value={`${data.humidity}%`} />
                <MetricBadge icon={Wind} label="Wind" value={`${data.windSpeed} km/h ${data.windDirectionText}`} />
                <MetricBadge icon={Eye} label="Visibility" value={`${data.visibility} km`} />
                <MetricBadge icon={Gauge} label="Pressure" value={`${data.pressure} hPa`} />
              </div>
            </div>
          </div>

          {/* Weather Metrics */}
          <WeatherMetrics data={data} />
        </motion.div>
      </div>
    </section>
  );
}

function MetricBadge({ icon: Icon, label, value }: { icon: typeof Droplets; label: string; value: string }) {
  return (
    <div className="glass-card-hover p-3 flex items-center gap-3">
      <Icon className="w-5 h-5 text-indigo-500" />
      <div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
        <div className="font-semibold text-slate-900 dark:text-white text-sm">{value}</div>
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="glass-card p-6 md:p-8">
      <div className="animate-pulse">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 mb-8">
          <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="text-center md:text-left">
            <div className="h-20 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-2" />
            <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
