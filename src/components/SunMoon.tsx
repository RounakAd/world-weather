import { motion } from 'framer-motion';
import { Clock, Moon, Sun, Sunrise, Sunset, Zap } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useLocalClock, useWeather } from '../hooks/useWeather';
import GlassCard from './GlassCard';
import { getUVCategory } from '../utils/helpers';

export default function SunMoon() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);
  const clock = useLocalClock(data?.utcOffsetSeconds);

  if (loading || !data) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-6 w-32 rounded-lg bg-slate-500/15" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-12 rounded-xl bg-slate-500/15" />
          ))}
        </div>
      </GlassCard>
    );
  }

  const uv = getUVCategory(data.uvIndex);

  /* live position of the sun along today's arc */
  const progress = Math.min(1, Math.max(0, data.dayProgress));
  const arcAngle = Math.PI * progress;
  const sunX = 150 - 132 * Math.cos(arcAngle);
  const sunY = 84 - 74 * Math.sin(arcAngle);

  const moonProgress =
    ((clock.minutes - data.sunsetMinutes + 1440) % 1440) /
    Math.max(1, 1440 - (data.sunsetMinutes - data.sunriseMinutes));

  return (
    <GlassCard tilt={3} className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <Sun className="h-4 w-4 text-amber-500" />
          Sun &amp; moon
        </h3>
        <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:text-amber-300">
          {data.isDay ? 'Daytime' : 'Night'}
        </span>
      </div>

      {/* ---------------------------- sun arc ------------------------------- */}
      <div className="glass-inset relative mb-4 overflow-hidden p-4">
        <svg viewBox="0 0 300 100" className="h-28 w-full">
          <defs>
            <linearGradient id="sunMoonArc" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="35%" stopColor="#fbbf24" />
              <stop offset="65%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
            <radialGradient id="sunMoonGlow">
              <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
            </radialGradient>
          </defs>

          <path
            d="M18 84 A 132 74 0 0 1 282 84"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeDasharray="3 4"
            className="text-slate-400/45"
          />
          <path
            d="M18 84 A 132 74 0 0 1 282 84"
            fill="none"
            stroke="url(#sunMoonArc)"
            strokeWidth="2.8"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            strokeDashoffset={100 * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1.2s ease' }}
          />
          <line x1="18" y1="84" x2="282" y2="84" stroke="currentColor" strokeWidth="1.2" className="text-slate-400/40" />

          <ellipse cx="150" cy="84" rx="64" ry="5.5" fill="url(#sunMoonGlow)" />

          <circle cx={sunX} cy={sunY} r="11" fill="url(#sunMoonGlow)" />
          <circle
            cx={sunX}
            cy={sunY}
            r={data.isDay ? 5.4 : 4.8}
            fill={data.isDay ? '#fbbf24' : '#e0e7ff'}
            stroke="#fff7ed"
            strokeWidth="1.4"
          />
        </svg>

        <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
          <span className="flex items-center gap-1">
            <Sunrise className="h-3 w-3 text-orange-500" /> {data.sunrise}
          </span>
          <span className="tabular">{data.localTime} local</span>
          <span className="flex items-center gap-1">
            {data.sunset} <Sunset className="h-3 w-3 text-orange-500" />
          </span>
        </div>
      </div>

      {/* ---------------------------- detail grid --------------------------- */}
      <div className="grid grid-cols-2 gap-2.5">
        <Tile icon={Sunrise} label="Sunrise" value={data.sunrise} hint={`Solar noon ${data.solarNoon}`} />
        <Tile icon={Sunset} label="Sunset" value={data.sunset} hint={`Day length ${data.dayLength}`} />
        <Tile
          icon={Clock}
          label="Day length"
          value={data.dayLength}
          hint={`${Math.round(progress * 100)}% elapsed`}
        />
        <Tile icon={Zap} label="UV index" value={`${data.uvIndex}`} hint={uv.label} valueColor={uv.color} />
      </div>

      {/* ---------------------------- daylight bar -------------------------- */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          <span>Daylight progress</span>
          <span>{data.isDay ? 'Sun is up' : 'Sun is down'}</span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-500/15">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-900/40 via-amber-300 to-indigo-900/40" />
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${progress * 100}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-amber-400 shadow-lg dark:border-slate-900"
          />
        </div>
      </div>

      {/* ------------------------------- moon ------------------------------- */}
      <div className="glass-inset mt-4 flex items-center gap-3 p-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-700 dark:to-slate-900">
          <span className="text-2xl leading-none">{data.moonPhaseIcon}</span>
          <span className="absolute -inset-1 rounded-full border border-white/20" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">Moon phase</div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">{data.moonPhase}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-500/20">
              <div
                className="h-full rounded-full bg-gradient-to-r from-slate-400 to-slate-100"
                style={{ width: `${data.moonIllumination}%` }}
              />
            </div>
            <span className="tabular text-[10px] font-semibold text-faint">{data.moonIllumination}% lit</span>
          </div>
        </div>
        <Moon className="h-4 w-4 shrink-0 text-slate-400" />
      </div>

      <p className="mt-3 text-[10px] text-faint">
        Night-time moon transit {Math.round(Math.min(100, Math.max(0, moonProgress * 100)))}% through the dark hours.
      </p>
    </GlassCard>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  valueColor,
}: {
  icon: typeof Sun;
  label: string;
  value: string;
  hint?: string;
  valueColor?: string;
}) {
  return (
    <div className="glass-inset p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className="tabular mt-0.5 text-base font-bold text-slate-900 dark:text-white"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {hint && <div className="text-[10px] text-faint">{hint}</div>}
    </div>
  );
}
