import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CloudRain,
  Droplets,
  Eye,
  Gauge,
  Info,
  MapPin,
  RefreshCw,
  Star,
  Sunrise,
  Sunset,
  Wind,
} from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useLocalClock, useWeather } from '../hooks/useWeather';
import { formatTemp, formatTempBare, generateWeatherAlerts, getUVCategory, RAIN_THRESHOLD } from '../utils/helpers';
import { RainOutlook } from '../types/weather';
import WeatherMetrics from './WeatherMetrics';
import WeatherIcon from './WeatherIcon';
import GlassCard from './GlassCard';

export default function FeaturedWeather() {
  const { selectedCity, unit, toggleFavorite, isFavorite } = useWeatherContext();
  const { data, loading, error, refetch } = useWeather(selectedCity);
  const clock = useLocalClock(data?.utcOffsetSeconds);
  const favourite = isFavorite(selectedCity.name);

  if (loading && !data) {
    return (
      <section id="current-weather" className="scroll-mt-28 px-4 pb-8 pt-4">
        <div className="mx-auto max-w-7xl">
          <FeaturedSkeleton />
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section id="current-weather" className="scroll-mt-28 px-4 pb-8 pt-4">
        <div className="mx-auto max-w-3xl text-center">
          <GlassCard className="p-8">
            <p className="mb-4 text-soft">Unable to load weather data for {selectedCity.name}.</p>
            <button type="button" onClick={refetch} className="btn-primary mx-auto flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Try again
            </button>
          </GlassCard>
        </div>
      </section>
    );
  }

  const alerts = generateWeatherAlerts(data);
  const uv = getUVCategory(data.uvIndex);

  /* where the current temperature sits between today's low and high */
  const rangeSpan = Math.max(1, data.tempMax - data.tempMin);
  const rangePos = Math.min(100, Math.max(0, ((data.temperature - data.tempMin) / rangeSpan) * 100));

  /* sun arc geometry */
  const arcProgress = Math.min(1, Math.max(0, data.dayProgress));
  const arcAngle = Math.PI * arcProgress;
  const sunX = 150 - 132 * Math.cos(arcAngle);
  const sunY = 84 - 74 * Math.sin(arcAngle);

  return (
    <section id="current-weather" className="scroll-mt-28 px-4 pb-8 pt-4">
      <div className="mx-auto max-w-7xl">
        <motion.div
          key={selectedCity.name}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* ------------------------------ alerts ---------------------------- */}
          {alerts.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2.5">
              {alerts.map((alert) => {
                const tone =
                  alert.severity === 'severe'
                    ? 'from-rose-500/20 to-red-500/10 border-rose-400/50 text-rose-700 dark:text-rose-300'
                    : alert.severity === 'warning'
                      ? 'from-amber-500/20 to-orange-500/10 border-amber-400/50 text-amber-700 dark:text-amber-300'
                      : 'from-sky-500/15 to-indigo-500/10 border-sky-400/40 text-sky-700 dark:text-sky-300';
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`flex items-center gap-2.5 rounded-2xl border bg-gradient-to-r px-3.5 py-2 backdrop-blur-xl ${tone}`}
                  >
                    <span className="text-lg leading-none">{alert.icon}</span>
                    <div className="leading-tight">
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide">
                        <AlertTriangle className="h-3 w-3" />
                        {alert.title}
                      </div>
                      <div className="text-[11px] opacity-80">{alert.detail}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* --------------------------- main weather ------------------------- */}
          <GlassCard tilt={5} className="mb-5 p-6 sm:p-8">
            {/* weather-reactive inner wash */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{
                background: data.isDay
                  ? `radial-gradient(120% 90% at 82% 6%, ${data.iconKind.includes('clear') ? 'rgba(251,191,36,0.28)' : 'rgba(129,140,248,0.24)'}, transparent 62%)`
                  : 'radial-gradient(120% 90% at 82% 6%, rgba(129,140,248,0.3), transparent 62%)',
              }}
            />

            <div className="relative">
              {/* header row */}
              <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
                      {data.city}
                    </h2>
                    <span className="text-2xl leading-none">{data.flag}</span>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(data.city)}
                      aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
                      className="rounded-lg p-1.5 transition-colors hover:bg-slate-500/10"
                    >
                      <Star
                        className={`h-4 w-4 ${favourite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`}
                      />
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-soft">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {data.country}
                    </span>
                    <span className="text-faint">·</span>
                    <span className="tabular">{data.timezone.replace('_', ' ')}</span>
                    {data.timezoneAbbr && <span className="text-faint">({data.timezoneAbbr})</span>}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-2xl border border-white/50 bg-white/50 px-3.5 py-2 text-right backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50">
                    <div className="tabular font-display text-lg font-bold leading-none text-slate-900 dark:text-white">
                      {clock.time}
                    </div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                      {data.localDate} · local time
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refetch}
                    aria-label="Refresh weather"
                    className="grid h-10 w-10 place-items-center rounded-2xl border border-white/50 bg-white/50 backdrop-blur-md transition-all hover:bg-white/80 dark:border-slate-700/50 dark:bg-slate-800/50 dark:hover:bg-slate-700/60"
                  >
                    <RefreshCw className={`h-4 w-4 text-slate-600 dark:text-slate-300 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* temperature block */}
              <div className="mb-7 flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:gap-10">
                <motion.div
                  initial={{ scale: 0.85, opacity: 0, rotate: -8 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className="shrink-0"
                  style={{ animation: 'float 7s ease-in-out infinite' }}
                >
                  <WeatherIcon kind={data.iconKind} size={140} title={data.condition} />
                </motion.div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="flex items-end justify-center gap-3 sm:justify-start">
                    <span className="tabular font-display text-6xl font-bold leading-none text-slate-900 sm:text-7xl dark:text-white">
                      {formatTempBare(data.temperature, unit)}
                    </span>
                    <span className="pb-2 text-lg font-medium text-soft">{unit === 'C' ? 'Celsius' : 'Fahrenheit'}</span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                    <span className="rounded-full bg-gradient-to-r from-indigo-500/15 to-violet-500/15 px-3 py-1 text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                      {data.condition}
                    </span>
                    <span className="text-sm text-soft">
                      Feels like <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatTemp(data.feelsLike, unit)}</strong>
                    </span>
                    <span className="text-sm text-faint">
                      {data.isDay ? '☀️ Daytime' : '🌙 Night'}
                    </span>
                  </div>

                  {/* low → high range bar */}
                  <div className="mt-5 max-w-md">
                    <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-soft">
                      <span>Low {formatTemp(data.tempMin, unit)}</span>
                      <span className="text-faint">Today's range</span>
                      <span>High {formatTemp(data.tempMax, unit)}</span>
                    </div>
                    <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-500/15">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 via-60% to-amber-400" />
                      <motion.div
                        initial={{ left: '0%' }}
                        animate={{ left: `${rangePos}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow-lg dark:border-slate-900 dark:bg-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* key metric badges */}
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <MetricBadge icon={Droplets} label="Humidity" value={`${data.humidity}%`} hint={`Dew point ${data.dewPoint}°`} />
                <MetricBadge
                  icon={Wind}
                  label="Wind"
                  value={`${data.windSpeed} km/h`}
                  hint={`${data.windDirectionText} · gusts ${data.windGust}`}
                />
                <MetricBadge icon={Eye} label="Visibility" value={`${data.visibility} km`} hint={data.visibility >= 10 ? 'Clear' : data.visibility >= 5 ? 'Moderate' : 'Poor'} />
                <MetricBadge icon={Gauge} label="Pressure" value={`${data.pressure} hPa`} hint={`MSL ${data.pressureMsl} hPa`} />
              </div>

              {/* ------------------------------ sun arc ------------------------- */}
              <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="glass-inset relative overflow-hidden p-4">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-faint">
                    <span className="flex items-center gap-1.5">
                      <Sunrise className="h-3.5 w-3.5 text-amber-500" /> {data.sunrise}
                    </span>
                    <span>{data.dayLength} of daylight</span>
                    <span className="flex items-center gap-1.5">
                      <Sunset className="h-3.5 w-3.5 text-orange-500" /> {data.sunset}
                    </span>
                  </div>

                  <svg viewBox="0 0 300 100" className="h-24 w-full">
                    <defs>
                      <linearGradient id="sunArcGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#fb923c" />
                        <stop offset="50%" stopColor="#fbbf24" />
                        <stop offset="100%" stopColor="#fb923c" />
                      </linearGradient>
                      <radialGradient id="sunArcGlow">
                        <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                      </radialGradient>
                    </defs>

                    <path
                      d="M18 84 A 132 74 0 0 1 282 84"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeDasharray="3 4"
                      className="text-slate-400/45"
                    />
                    <path
                      d="M18 84 A 132 74 0 0 1 282 84"
                      fill="none"
                      stroke="url(#sunArcGradient)"
                      strokeWidth="2.8"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset={100 * (1 - arcProgress)}
                      style={{ transition: 'stroke-dashoffset 1.2s ease' }}
                    />
                    <line
                      x1="18"
                      y1="84"
                      x2="282"
                      y2="84"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      className="text-slate-400/40"
                    />
                    <ellipse cx="150" cy="84" rx="70" ry="6" fill="url(#sunArcGlow)" />
                    <circle cx={sunX} cy={sunY} r="12" fill="url(#sunArcGlow)" />
                    <circle
                      cx={sunX}
                      cy={sunY}
                      r={data.isDay ? 5.6 : 5}
                      fill={data.isDay ? '#fbbf24' : '#e0e7ff'}
                      stroke="#fff7ed"
                      strokeWidth="1.4"
                    />
                  </svg>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
                    <span>Solar noon {data.solarNoon}</span>
                    <span>
                      {data.isDay ? `${Math.round(arcProgress * 100)}% of daylight elapsed` : 'Sun is below the horizon'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-inset flex flex-col justify-center p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">UV index</div>
                    <div className="tabular font-display text-2xl font-bold" style={{ color: uv.color }}>
                      {data.uvIndex}
                    </div>
                    <div className="text-[11px] font-medium" style={{ color: uv.color }}>
                      {uv.label}
                    </div>
                  </div>
                  <div className="glass-inset flex flex-col justify-center p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Cloud cover</div>
                    <div className="tabular font-display text-2xl font-bold text-slate-900 dark:text-white">
                      {data.cloudCover}%
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-500/15">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-sky-400 to-slate-400"
                        style={{ width: `${data.cloudCover}%` }}
                      />
                    </div>
                  </div>
                  <div className="glass-inset flex flex-col justify-center p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Rain chance</div>
                    <div className="tabular font-display text-2xl font-bold text-sky-600 dark:text-sky-300">
                      {data.rainProbability}%
                    </div>
                    <div className="text-[11px] text-faint">{data.rainfall} mm this hour</div>
                  </div>
                  <div className="glass-inset flex flex-col justify-center p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Moon</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xl leading-none">{data.moonPhaseIcon}</span>
                      <span className="tabular font-display text-lg font-bold text-slate-900 dark:text-white">
                        {data.moonIllumination}%
                      </span>
                    </div>
                    <div className="text-[11px] text-faint">{data.moonPhase}</div>
                  </div>
                </div>
              </div>

              {/* ---------------------------- rain today ------------------------ */}
              <RainTodaySection outlook={data.todayRain} />

              <div className="mt-4 flex items-center gap-1.5 text-[11px] text-faint">
                <Info className="h-3 w-3" />
                {data.isSample
                  ? `Sample data for ${data.lastUpdated} local time — the live feed is unreachable, so these figures are placeholders. Retrying every 10 minutes.`
                  : `Updated ${data.lastUpdated} local time · auto-refreshes every 10 minutes`}
              </div>
            </div>
          </GlassCard>

          <WeatherMetrics data={data} />
        </motion.div>
      </div>
    </section>
  );
}

function MetricBadge({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-inset group flex items-center gap-3 p-3 transition-transform duration-300 hover:-translate-y-0.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10">
        <Icon className="h-4 w-4 text-indigo-500" />
      </span>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</div>
        <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{value}</div>
        {hint && <div className="truncate text-[10px] text-faint">{hint}</div>}
      </div>
    </div>
  );
}

const RAIN_STATUS = {
  now: { label: 'Raining now', tone: 'bg-sky-500/25 text-sky-700 dark:text-sky-200' },
  next: { label: 'Next up', tone: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300' },
  later: { label: 'Later today', tone: 'bg-slate-500/15 text-soft' },
  past: { label: 'Passed', tone: 'bg-slate-500/10 text-faint' },
} as const;

/**
 * When it might rain today, in the city's own local time: a bar for every hour of
 * the calendar day (00:00 → 23:00, past hours dimmed) plus the wet spells spelled
 * out as start → end timings.
 */
function RainTodaySection({ outlook }: { outlook: RainOutlook }) {
  const { slots, windows, peakProb, totalRainfall, currentlyRaining, nextWindow } = outlook;
  const nowHour = slots.find((slot) => slot.isNow)?.hour ?? -1;
  const maxProb = Math.max(RAIN_THRESHOLD + 10, ...slots.map((slot) => slot.precipProb));
  const barHeight = (prob: number) => Math.max(3, Math.round((prob / maxProb) * 46));

  const headline = currentlyRaining
    ? 'Raining right now'
    : nextWindow
      ? `Next wet spell around ${nextWindow.startLabel}`
      : windows.length
        ? "All of today's rain has already passed"
        : 'No rain expected at any point today';

  return (
    <div className="glass-inset mt-6 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="relative grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500/25 to-indigo-500/10">
            <CloudRain className="h-4 w-4 text-sky-500" />
            {currentlyRaining && (
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-ping rounded-full bg-sky-400" />
            )}
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
              Rain timings · today
            </div>
            <div className="text-xs font-semibold text-slate-900 dark:text-white">{headline}</div>
          </div>
        </div>

        <span className="tabular rounded-full bg-sky-500/15 px-3 py-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
          {windows.length === 0
            ? 'Dry day'
            : `${windows.length} ${windows.length === 1 ? 'window' : 'windows'} · peak ${peakProb}%`}
        </span>
      </div>

      {/* every hour of the local day, 12 AM → 11 PM */}
      <div className="relative h-[52px]">
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {slots.map((slot) => {
            const wet = slot.precipProb >= RAIN_THRESHOLD;
            const height = barHeight(slot.precipProb);
            return (
              <div
                key={slot.time}
                className="relative flex-1"
                title={`${slot.label} · ${slot.precipProb}% chance${slot.rainfall > 0 ? ` · ${slot.rainfall} mm` : ''}`}
              >
                <div
                  className={`absolute bottom-0 w-full rounded-t-[3px] ${
                    wet ? 'bg-gradient-to-t from-sky-500 to-cyan-400' : 'bg-slate-400/35'
                  } ${slot.isPast ? 'opacity-30' : ''}`}
                  style={{ height: `${height}px` }}
                />
                {wet && (
                  <span
                    className="tabular absolute w-full text-center text-[8px] font-semibold text-sky-600 dark:text-sky-300"
                    style={{ bottom: `${height + 1}px` }}
                  >
                    {slot.precipProb}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* anything above this line is an hour that might rain */}
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-slate-400/50 dark:border-slate-500/45"
          style={{ bottom: `${(RAIN_THRESHOLD / maxProb) * 46}px` }}
        >
          <span className="tabular absolute -top-[9px] left-0 rounded bg-white/70 px-1 text-[8px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-900/70 dark:text-slate-400">
            {RAIN_THRESHOLD}% chance
          </span>
        </div>

        {/* the current hour, so "might rain later" is read against a real clock */}
        {nowHour >= 0 && (
          <div
            className="pointer-events-none absolute bottom-0 top-0 w-px bg-slate-900/25 dark:bg-white/40"
            style={{ left: `${((nowHour + 0.5) / 24) * 100}%` }}
          >
            <span className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-slate-900/60 dark:bg-white/70" />
          </div>
        )}
      </div>

      <div className="relative mt-1 h-3.5">
        {slots
          .filter((slot) => slot.hour % 6 === 0)
          .map((slot) => (
            <span
              key={slot.time}
              className="tabular absolute -translate-x-1/2 text-[9px] text-faint"
              style={{ left: `${((slot.hour + 0.5) / 24) * 100}%` }}
            >
              {slot.label}
            </span>
          ))}
      </div>

      {/* the wet spells themselves, start → end */}
      {windows.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {windows.map((window) => {
            const status = window.isNow
              ? 'now'
              : window.isPast
                ? 'past'
                : window === nextWindow
                  ? 'next'
                  : 'later';
            return (
              <li
                key={window.startTime}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-white/45 bg-white/40 px-3 py-2 dark:border-slate-700/40 dark:bg-slate-800/35"
              >
                <span className="flex min-w-[7.5rem] items-center gap-1.5 text-[13px] font-bold text-slate-900 dark:text-white">
                  <Droplets className="h-3.5 w-3.5 shrink-0 text-sky-500" />
                  <span className="tabular">
                    {window.hours === 1 ? window.startLabel : `${window.startLabel} – ${window.endLabel}`}
                  </span>
                </span>
                <span className="tabular text-[11px] text-soft">
                  up to {window.peakProb}% · {window.hours} h
                  {window.totalRainfall > 0 ? ` · ${window.totalRainfall} mm` : ''}
                </span>
                <span
                  className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${RAIN_STATUS[status].tone}`}
                >
                  {RAIN_STATUS[status].label}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 rounded-xl border border-white/45 bg-white/35 px-3 py-2 text-[11px] text-soft dark:border-slate-700/40 dark:bg-slate-800/35">
          Not one hour today reaches the {RAIN_THRESHOLD}% chance threshold — the umbrella can stay folded.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-faint">
        <span>Local day · 12 AM to 11 PM</span>
        <span>Peak chance {peakProb}%</span>
        {totalRainfall > 0 && <span>{totalRainfall} mm expected</span>}
        <span>Dashed line marks the {RAIN_THRESHOLD}% threshold</span>
      </div>
    </div>
  );
}

function FeaturedSkeleton() {
  return (
    <div className="glass p-6 sm:p-8">
      <div className="animate-pulse space-y-6">
        <div className="flex justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-xl bg-slate-500/15" />
            <div className="h-4 w-40 rounded-lg bg-slate-500/15" />
          </div>
          <div className="h-14 w-32 rounded-2xl bg-slate-500/15" />
        </div>
        <div className="flex items-center gap-8">
          <div className="h-32 w-32 rounded-full bg-slate-500/15" />
          <div className="flex-1 space-y-3">
            <div className="h-16 w-48 rounded-2xl bg-slate-500/15" />
            <div className="h-5 w-64 rounded-lg bg-slate-500/15" />
            <div className="h-2.5 w-full max-w-md rounded-full bg-slate-500/15" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-16 rounded-2xl bg-slate-500/15" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="h-36 rounded-2xl bg-slate-500/15" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-2xl bg-slate-500/15" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
