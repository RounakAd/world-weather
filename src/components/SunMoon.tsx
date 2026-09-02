import { motion } from 'framer-motion';
import { Sun, Moon, Clock, Sunrise, Sunset } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';

export default function SunMoon() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  if (loading || !data) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Sun className="w-5 h-5 text-amber-500" />
        Sun & Day
      </h3>

      <div className="space-y-4">
        {/* Sunrise/Sunset */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Sunrise className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Sunrise</div>
              <div className="font-semibold text-slate-900 dark:text-white">{data.sunrise}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 text-right">Sunset</div>
              <div className="font-semibold text-slate-900 dark:text-white">{data.sunset}</div>
            </div>
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Sunset className="w-5 h-5 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Day length */}
        <div className="glass-card-hover p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-indigo-500" />
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Day Length</div>
              <div className="font-semibold text-slate-900 dark:text-white">{data.dayLength}</div>
            </div>
          </div>
        </div>

        {/* Solar noon and UV */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-card-hover p-3 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Solar Noon</div>
            <div className="font-semibold text-slate-900 dark:text-white">12:30 PM</div>
          </div>
          <div className="glass-card-hover p-3 text-center">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">UV Index</div>
            <div className="font-semibold text-slate-900 dark:text-white">{data.uvIndex}</div>
          </div>
        </div>

        {/* Moon info placeholder */}
        <div className="glass-card-hover p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Moon className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Moon Phase</div>
            <div className="font-semibold text-slate-900 dark:text-white">Waxing Crescent</div>
          </div>
        </div>
      </div>
    </div>
  );
}
