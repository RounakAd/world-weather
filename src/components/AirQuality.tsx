import { motion } from 'framer-motion';
import { Wind, Cloud, Droplets, Sparkles } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useAirQuality } from '../hooks/useWeather';
import { getAQIColor, getAQISummary } from '../utils/helpers';

export default function AirQuality() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useAirQuality(selectedCity);

  if (loading) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="flex items-center gap-4 mb-4">
            <div className="w-24 h-24 bg-slate-200 dark:bg-slate-700 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-3/4 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🌫 Air Quality</h3>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Air quality data is currently unavailable for this location.
        </p>
      </div>
    );
  }

  const aqiColor = getAQIColor(data.aqi);

  const pollutants = [
    { label: 'PM2.5', value: data.pm25, unit: 'µg/m³', icon: Cloud },
    { label: 'PM10', value: data.pm10, unit: 'µg/m³', icon: Wind },
    { label: 'NO₂', value: data.no2, unit: 'µg/m³', icon: Sparkles },
    { label: 'O₃', value: data.o3, unit: 'µg/m³', icon: Cloud },
    { label: 'SO₂', value: data.so2, unit: 'µg/m³', icon: Cloud },
    { label: 'CO', value: data.co, unit: 'µg/m³', icon: Droplets },
  ];

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🌫 Air Quality</h3>

      {/* AQI Display */}
      <div className="flex items-center gap-4 mb-4">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: `${aqiColor}20` }}
        >
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200 dark:text-slate-700"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke={aqiColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(data.aqi / 300) * 251.2} 251.2`}
              initial={{ strokeDasharray: '0 251.2' }}
              animate={{ strokeDasharray: `${(data.aqi / 300) * 251.2} 251.2` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: aqiColor }}>
              {data.aqi}
            </span>
            <span className="text-xs text-slate-500">AQI</span>
          </div>
        </div>

        <div>
          <div
            className="text-lg font-semibold mb-1"
            style={{ color: aqiColor }}
          >
            {data.category}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
            {getAQISummary(data.aqi)}
          </p>
        </div>
      </div>

      {/* Pollutants Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {pollutants.map((pollutant) => (
          <div
            key={pollutant.label}
            className="glass-card-hover p-3 flex items-center gap-3"
          >
            <pollutant.icon className="w-5 h-5 text-slate-400" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {pollutant.label}
              </div>
              <div className="font-semibold text-slate-900 dark:text-white">
                {pollutant.value} <span className="text-xs font-normal text-slate-400">{pollutant.unit}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
