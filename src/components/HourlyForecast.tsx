import { useId, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Droplets, Wind } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import WeatherIcon from './WeatherIcon';
import GlassCard from './GlassCard';
import { formatTempBare } from '../utils/helpers';

const ITEM_WIDTH = 76;
const GAP = 8;

export default function HourlyForecast() {
  const { selectedCity, unit } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);
  const [span, setSpan] = useState<24 | 48>(24);
  const uid = useId().replace(/[:]/g, '');

  const hours = useMemo(() => data?.hourly.slice(0, span) ?? [], [data, span]);

  if (loading || !data) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded-lg bg-slate-500/15" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 10 }).map((_, index) => (
              <div key={index} className="h-28 w-[76px] shrink-0 rounded-2xl bg-slate-500/15" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  if (hours.length === 0) return null;

  const temps = hours.map((hour) => hour.temp);
  const min = Math.min(...temps);
  const max = Math.max(...temps);
  const span2 = Math.max(1, max - min);

  const totalWidth = hours.length * ITEM_WIDTH + (hours.length - 1) * GAP;
  const chartHeight = 58;
  const padY = 15;

  const points = hours.map((hour, index) => {
    const x = index * (ITEM_WIDTH + GAP) + ITEM_WIDTH / 2;
    const ratio = (hour.temp - min) / span2;
    const y = chartHeight - padY - ratio * (chartHeight - padY * 2);
    return { x, y, hour };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const warmest = points.reduce((best, point) => (point.hour.temp > best.hour.temp ? point : best), points[0]);
  const coolest = points.reduce((best, point) => (point.hour.temp < best.hour.temp ? point : best), points[0]);
  const peakRain = hours.reduce((best, hour) => (hour.precipProb > best.precipProb ? hour : best), hours[0]);

  return (
    <GlassCard tilt={2} className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
            <Clock className="h-4 w-4 text-indigo-500" />
            Hourly forecast
          </h3>
          <p className="mt-0.5 text-[11px] text-faint">
            All times shown in {data.city}'s local time ({data.timezone.replace('_', ' ')})
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/40 bg-white/40 p-1 dark:border-slate-700/40 dark:bg-slate-800/40">
          {([24, 48] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setSpan(option)}
              className={`relative rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors ${
                span === option ? 'text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {span === option && (
                <motion.span
                  layoutId="hourly-span"
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{option}h</span>
            </button>
          ))}
        </div>
      </div>

      {/* summary line */}
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-soft">
        <span>
          Warmest <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatTempBare(warmest.hour.temp, unit)}</strong> at {warmest.hour.label}
        </span>
        <span>
          Coolest <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatTempBare(coolest.hour.temp, unit)}</strong> at {coolest.hour.label}
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="h-3 w-3 text-sky-500" />
          Peak rain chance {peakRain.precipProb}% at {peakRain.label}
        </span>
      </div>

      {/* scrollable timeline: chart + cards share one width so they stay aligned */}
      <div className="overflow-x-auto pb-1 scrollbar-slim">
        <div style={{ width: totalWidth }} className="min-w-full">
          {/* temperature curve */}
          <svg width={totalWidth} height={chartHeight} className="mb-1 block overflow-visible">
            <defs>
              <linearGradient id={`hourly-fill-${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id={`hourly-line-${uid}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>

            <path d={areaPath} fill={`url(#hourly-fill-${uid})`} />
            <motion.path
              d={linePath}
              fill="none"
              stroke={`url(#hourly-line-${uid})`}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            />

            {points.map((point, index) =>
              index % 3 === 0 || index === 0 ? (
                <g key={point.hour.time}>
                  <circle cx={point.x} cy={point.y} r="2.6" fill="#fff" stroke="#6366f1" strokeWidth="1.6" />
                  <text
                    x={point.x}
                    y={point.y - 8}
                    textAnchor="middle"
                    fontSize="9.5"
                    fontWeight="700"
                    fill="currentColor"
                    className="text-slate-600 dark:text-slate-300"
                  >
                    {formatTempBare(point.hour.temp, unit)}
                  </text>
                </g>
              ) : null,
            )}
          </svg>

          {/* hour cards */}
          <div className="flex" style={{ gap: GAP }}>
            {hours.map((hour, index) => (
              <motion.div
                key={hour.time}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.5), duration: 0.4 }}
                className={`group flex shrink-0 flex-col items-center rounded-2xl border px-2 py-2.5 transition-all duration-300 hover:-translate-y-1 ${
                  hour.isNow
                    ? 'border-indigo-400/60 bg-gradient-to-b from-indigo-500/20 to-violet-500/10 shadow-lg shadow-indigo-500/20'
                    : 'border-white/40 bg-white/35 hover:bg-white/60 dark:border-slate-700/40 dark:bg-slate-800/30 dark:hover:bg-slate-700/40'
                }`}
                style={{ width: ITEM_WIDTH }}
              >
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide ${
                    hour.isNow ? 'text-indigo-600 dark:text-indigo-300' : 'text-faint'
                  }`}
                >
                  {hour.isNow ? 'Now' : hour.label}
                </span>

                {(hour.isNow || hour.time.slice(11, 16) === '00:00') && (
                  <span className="mt-0.5 rounded-full bg-slate-500/15 px-1.5 py-px text-[8px] font-semibold uppercase tracking-wider text-faint">
                    {hour.time.slice(11, 16) === '00:00' ? hour.dayLabel : 'today'}
                  </span>
                )}

                <WeatherIcon kind={hour.iconKind} size={34} className="my-1.5" still />

                <span className="tabular text-sm font-bold text-slate-900 dark:text-white">
                  {formatTempBare(hour.temp, unit)}
                </span>

                <span
                  className={`mt-1 flex items-center gap-0.5 text-[10px] font-semibold ${
                    hour.precipProb >= 40
                      ? 'text-sky-600 dark:text-sky-300'
                      : hour.precipProb > 0
                        ? 'text-sky-500/80'
                        : 'text-transparent'
                  }`}
                >
                  <Droplets className="h-2.5 w-2.5" />
                  {hour.precipProb}%
                </span>

                <span className="mt-1 flex items-center gap-0.5 text-[9px] text-faint">
                  <Wind className="h-2.5 w-2.5" />
                  {hour.wind}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-faint">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" /> Now
        </span>
        <span className="flex items-center gap-1">
          <Droplets className="h-2.5 w-2.5 text-sky-500" /> Precipitation probability
        </span>
        <span className="flex items-center gap-1">
          <Wind className="h-2.5 w-2.5" /> Wind speed (km/h)
        </span>
        <span className="ml-auto">Scroll horizontally to see more →</span>
      </div>
    </GlassCard>
  );
}
