import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, CloudRain, Droplets, Sun, Sunrise, Sunset, Wind } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import WeatherIcon from './WeatherIcon';
import GlassCard from './GlassCard';
import { formatTempBare, getUVCategory } from '../utils/helpers';

export default function SevenDayForecast() {
  const { selectedCity, unit } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);
  const [expandedDay, setExpandedDay] = useState<number | null>(0);

  const bounds = useMemo(() => {
    if (!data) return { min: 0, max: 1 };
    const mins = data.forecast.map((day) => day.tempMin);
    const maxs = data.forecast.map((day) => day.tempMax);
    const min = Math.min(...mins);
    const max = Math.max(...maxs);
    return { min, max: max === min ? min + 1 : max };
  }, [data]);

  if (loading || !data) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-40 rounded-lg bg-slate-500/15" />
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="h-16 rounded-2xl bg-slate-500/15" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const weekHigh = Math.max(...data.forecast.map((day) => day.tempMax));
  const weekLow = Math.min(...data.forecast.map((day) => day.tempMin));
  const wettest = data.forecast.reduce((best, day) => (day.rainfall > best.rainfall ? day : best), data.forecast[0]);

  return (
    <GlassCard tilt={2} className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">7-day forecast</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            {data.city} · week range {formatTempBare(weekLow, unit)} → {formatTempBare(weekHigh, unit)}
          </p>
        </div>
        <span className="rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
          {wettest.rainfall > 0 ? `Wettest: ${wettest.day} (${wettest.rainfall} mm)` : 'No rain expected'}
        </span>
      </div>

      <div className="space-y-2">
        {data.forecast.map((day, index) => {
          const isOpen = expandedDay === index;
          const left = ((day.tempMin - bounds.min) / (bounds.max - bounds.min)) * 100;
          const width = Math.max(6, ((day.tempMax - day.tempMin) / (bounds.max - bounds.min)) * 100);

          return (
            <motion.div
              key={day.date}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04, duration: 0.4 }}
            >
              <button
                type="button"
                onClick={() => setExpandedDay(isOpen ? null : index)}
                aria-expanded={isOpen}
                className={`w-full rounded-2xl border p-3 text-left transition-all duration-300 sm:p-3.5 ${
                  isOpen
                    ? 'border-indigo-400/50 bg-gradient-to-r from-indigo-500/12 to-violet-500/8 shadow-lg shadow-indigo-500/10'
                    : 'border-white/40 bg-white/35 hover:border-white/70 hover:bg-white/60 dark:border-slate-700/40 dark:bg-slate-800/30 dark:hover:bg-slate-700/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* day */}
                  <div className="w-16 shrink-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white">
                      {day.isToday ? 'Today' : day.day}
                    </div>
                    <div className="text-[10px] text-faint">{day.dateLabel}</div>
                  </div>

                  <WeatherIcon kind={day.iconKind} size={34} still className="shrink-0" />

                  <div className="hidden min-w-0 flex-1 sm:block">
                    <div className="truncate text-xs font-medium text-slate-700 dark:text-slate-300">
                      {day.condition}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] text-faint">
                      <span className="flex items-center gap-0.5">
                        <Droplets className="h-2.5 w-2.5 text-sky-500" />
                        {day.rainProb}%
                      </span>
                      {day.rainfall > 0 && <span>{day.rainfall} mm</span>}
                      <span className="flex items-center gap-0.5">
                        <Wind className="h-2.5 w-2.5" />
                        {day.windSpeed}
                      </span>
                    </div>
                  </div>

                  {/* temperature range bar */}
                  <div className="flex min-w-[104px] flex-1 items-center gap-2 sm:max-w-[220px]">
                    <span className="tabular w-8 shrink-0 text-right text-xs font-semibold text-sky-600 dark:text-sky-300">
                      {formatTempBare(day.tempMin, unit)}
                    </span>
                    <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-500/15">
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-0 h-full rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-orange-500"
                        style={{ left: `${left}%`, width: `${width}%` }}
                      />
                    </div>
                    <span className="tabular w-8 shrink-0 text-xs font-bold text-orange-600 dark:text-orange-300">
                      {formatTempBare(day.tempMax, unit)}
                    </span>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-3 px-1 pb-2 pt-3 sm:grid-cols-3 lg:grid-cols-4">
                      <Detail icon={Wind} label="Wind" value={`${day.windSpeed} km/h`} hint={`gusts ${day.windGust}`} />
                      <Detail icon={Droplets} label="Humidity" value={`${day.humidity}%`} hint={day.humidity >= 70 ? 'Humid' : 'Moderate'} />
                      <Detail icon={CloudRain} label="Rainfall" value={`${day.rainfall} mm`} hint={`${day.rainProb}% chance`} />
                      <Detail
                        icon={Sun}
                        label="UV index"
                        value={`${day.uvIndex}`}
                        hint={getUVCategory(day.uvIndex).label}
                      />
                      <Detail icon={Sunrise} label="Sunrise" value={day.sunrise} hint={day.daylight} />
                      <Detail icon={Sunset} label="Sunset" value={day.sunset} hint={`${day.condition}`} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </GlassCard>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-inset flex items-center gap-2.5 p-2.5">
      <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</div>
        <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{value}</div>
        {hint && <div className="truncate text-[10px] text-faint">{hint}</div>}
      </div>
    </div>
  );
}
