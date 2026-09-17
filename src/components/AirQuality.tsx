import { motion } from 'framer-motion';
import { Activity, AlertCircle, Leaf, Wind } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useAirQuality } from '../hooks/useWeather';
import GlassCard from './GlassCard';
import { AQI_BANDS, getAQIBand, getAQIScale, getAQISummary, pollutantLoad } from '../utils/helpers';

const POLLUTANTS = [
  { key: 'pm25', label: 'PM2.5', unit: 'µg/m³', reference: 15, blurb: 'Fine particles' },
  { key: 'pm10', label: 'PM10', unit: 'µg/m³', reference: 45, blurb: 'Coarse dust' },
  { key: 'no2', label: 'NO₂', unit: 'µg/m³', reference: 25, blurb: 'Traffic exhaust' },
  { key: 'o3', label: 'O₃', unit: 'µg/m³', reference: 100, blurb: 'Ground ozone' },
  { key: 'so2', label: 'SO₂', unit: 'µg/m³', reference: 40, blurb: 'Industrial' },
  { key: 'co', label: 'CO', unit: 'µg/m³', reference: 4000, blurb: 'Combustion' },
] as const;

export default function AirQuality() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useAirQuality(selectedCity);

  if (loading) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-32 rounded-lg bg-slate-500/15" />
          <div className="mx-auto h-40 w-40 rounded-full bg-slate-500/15" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-8 rounded-lg bg-slate-500/15" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  if (!data) {
    return (
      <GlassCard className="p-5">
        <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <Leaf className="h-4 w-4 text-emerald-500" />
          Air quality
        </h3>
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Air quality data is currently unavailable for this location.
        </div>
      </GlassCard>
    );
  }

  const band = getAQIBand(data.aqi);
  const scale = getAQIScale(data.aqi);

  /* 270° gauge — the circle's pathLength is normalised to 100, so 75 = 270° */
  const gaugeProgress = scale * 75;
  const markerAngle = ((135 + scale * 270) * Math.PI) / 180;
  const markerX = 100 + 78 * Math.cos(markerAngle);
  const markerY = 100 + 78 * Math.sin(markerAngle);

  const loads = POLLUTANTS.map((pollutant) => ({
    ...pollutant,
    value: data[pollutant.key],
    load: pollutantLoad(data[pollutant.key], pollutant.reference),
  }));
  const maxLoad = Math.max(35, ...loads.map((item) => item.load));

  return (
    <GlassCard tilt={3} className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <Leaf className="h-4 w-4 text-emerald-500" />
          Air quality
        </h3>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]"
          style={{ background: `${band.color}22`, color: band.color }}
        >
          {band.short}
        </span>
      </div>

      {/* ------------------------------- gauge ------------------------------ */}
      <div className="relative mx-auto mb-4 w-full max-w-[230px]">
        <svg viewBox="0 0 200 168" className="w-full">
          <defs>
            <filter id="aqiGlow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* tick ring */}
          <g transform="rotate(135 100 100)">
            {Array.from({ length: 28 }).map((_, index) => {
              const angle = (index / 27) * 270;
              const major = index % 3 === 0;
              return (
                <line
                  key={index}
                  x1="100"
                  y1="13"
                  x2="100"
                  y2={major ? 23 : 19}
                  stroke="currentColor"
                  strokeWidth={major ? 2 : 1}
                  strokeLinecap="round"
                  className="text-slate-400/45"
                  transform={`rotate(${angle} 100 100)`}
                />
              );
            })}
          </g>

          {/* track */}
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            stroke="currentColor"
            className="text-slate-400/25"
            strokeWidth="13"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="75 100"
            transform="rotate(135 100 100)"
          />

          {/* value arc */}
          <motion.circle
            cx="100"
            cy="100"
            r="78"
            fill="none"
            stroke={band.color}
            strokeWidth="13"
            strokeLinecap="round"
            pathLength={100}
            initial={{ strokeDasharray: '0 100' }}
            animate={{ strokeDasharray: `${gaugeProgress} 100` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            transform="rotate(135 100 100)"
            filter="url(#aqiGlow)"
          />

          {/* marker on the arc */}
          <motion.g
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 220, damping: 18 }}
            style={{ transformOrigin: `${markerX}px ${markerY}px` }}
          >
            <circle cx={markerX} cy={markerY} r="9" fill="#ffffff" opacity="0.9" />
            <circle cx={markerX} cy={markerY} r="6.5" fill={band.color} />
          </motion.g>

          {/* centre readout */}
          <text x="100" y="106" textAnchor="middle" fontSize="44" fontWeight="800" fill={band.color}>
            {data.aqi}
          </text>
          <text x="100" y="126" textAnchor="middle" fontSize="11" fontWeight="700" letterSpacing="3" className="fill-slate-400">
            US AQI
          </text>
        </svg>
      </div>

      {/* --------------------------- category scale ------------------------- */}
      <div className="mb-4">
        <div className="relative flex h-2.5 overflow-hidden rounded-full">
          {AQI_BANDS.map((item) => (
            <div key={item.label} className="flex-1" style={{ background: item.color }} />
          ))}
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${scale * 100}%` }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow-lg dark:border-slate-900 dark:bg-white"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] font-medium text-faint">
          <span>0</span>
          <span>50</span>
          <span>100</span>
          <span>150</span>
          <span>200</span>
          <span>300+</span>
        </div>
      </div>

      {/* ----------------------------- summary ----------------------------- */}
      <div
        className="mb-4 rounded-2xl border p-3 text-xs leading-relaxed"
        style={{ background: `${band.color}14`, borderColor: `${band.color}44`, color: 'var(--ink-soft)' }}
      >
        <div className="mb-1 flex items-center gap-1.5 font-bold" style={{ color: band.color }}>
          <Activity className="h-3.5 w-3.5" />
          {data.category}
        </div>
        {getAQISummary(data.aqi)}
        {data.dominant && (
          <div className="mt-2 flex items-center gap-1.5 text-[11px]">
            <Wind className="h-3 w-3" />
            Dominant pollutant: <strong className="font-semibold">{data.dominant}</strong>
            <span className="text-faint">({data.dominantValue} µg/m³)</span>
          </div>
        )}
      </div>

      {/* --------------------------- pollutant grid ------------------------- */}
      <div className="grid grid-cols-2 gap-2.5">
        {loads.map((pollutant, index) => {
          const tone =
            pollutant.load >= 100 ? '#ef4444' : pollutant.load >= 60 ? '#f97316' : pollutant.load >= 35 ? '#eab308' : '#22c55e';
          const barWidth = Math.max(6, (pollutant.load / maxLoad) * 100);
          return (
            <motion.div
              key={pollutant.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-inset p-2.5"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{pollutant.label}</span>
                <span className="tabular text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {pollutant.value}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-500/15">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, delay: 0.1 + index * 0.05, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: tone }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] text-faint">
                <span>{pollutant.blurb}</span>
                <span className="tabular" style={{ color: tone }}>
                  {pollutant.load}% of guide
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] text-faint">
        Bars are scaled relative to the worst pollutant and annotated with the share of the WHO 24-hour guideline.
        US AQI scale 0–500.
      </p>
    </GlassCard>
  );
}
