import { motion } from 'framer-motion';
import { Compass, Gauge, Navigation, Wind } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import GlassCard from './GlassCard';
import { getBeaufortDescription, getWindDirectionLong, getWindDirectionText } from '../utils/helpers';

const CARDINALS = ['N', 'E', 'S', 'W'];

export default function WindCard() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  if (loading || !data) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-24 rounded-lg bg-slate-500/15" />
          <div className="mx-auto h-40 w-40 rounded-full bg-slate-500/15" />
          <div className="h-3 rounded-full bg-slate-500/15" />
        </div>
      </GlassCard>
    );
  }

  const beaufort = getBeaufortDescription(data.windSpeed);
  const gustBeaufort = getBeaufortDescription(data.windGust);
  const longDir = getWindDirectionLong(data.windDirection);

  /* the arrow points where the air is travelling to */
  const arrowAngle = (data.windDirection + 180) % 360;
  const speedRatio = Math.min(1, data.windSpeed / 120);

  return (
    <GlassCard tilt={3} className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
          <Wind className="h-4 w-4 text-cyan-500" />
          Wind
        </h3>
        <span className="rounded-full bg-cyan-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-700 dark:text-cyan-300">
          Beaufort {beaufort.scale}
        </span>
      </div>

      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-between">
        {/* ------------------------------ compass --------------------------- */}
        <div className="relative h-40 w-40 shrink-0">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <defs>
              <radialGradient id="compassFace" cx="0.4" cy="0.35">
                <stop offset="0%" stopColor="rgba(148,163,184,0.2)" />
                <stop offset="100%" stopColor="rgba(148,163,184,0.05)" />
              </radialGradient>
              <linearGradient id="windArcGradient" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" />
                <stop offset="60%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#f43f5e" />
              </linearGradient>
            </defs>

            <circle cx="100" cy="100" r="88" fill="url(#compassFace)" />
            <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-400/30" />
            <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 4" className="text-slate-400/25" />

            {/* 16-point tick ring */}
            {Array.from({ length: 16 }).map((_, index) => {
              const angle = index * 22.5;
              const major = index % 4 === 0;
              return (
                <line
                  key={index}
                  x1="100"
                  y1={major ? 15 : 19}
                  x2="100"
                  y2={major ? 28 : 24}
                  stroke="currentColor"
                  strokeWidth={major ? 2.2 : 1.1}
                  strokeLinecap="round"
                  className={major ? 'text-slate-500/70' : 'text-slate-400/40'}
                  transform={`rotate(${angle} 100 100)`}
                />
              );
            })}

            {/* degree labels every 45° */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
              const rad = ((angle - 90) * Math.PI) / 180;
              const x = 100 + 42 * Math.cos(rad);
              const y = 100 + 42 * Math.sin(rad);
              return (
                <text
                  key={angle}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8.5"
                  className="fill-slate-400"
                >
                  {angle}°
                </text>
              );
            })}

            {/* cardinals */}
            {CARDINALS.map((dir, index) => {
              const angle = index * 90;
              const rad = ((angle - 90) * Math.PI) / 180;
              const x = 100 + 66 * Math.cos(rad);
              const y = 100 + 66 * Math.sin(rad);
              return (
                <text
                  key={dir}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="14"
                  fontWeight="800"
                  className={dir === 'N' ? 'fill-rose-500' : 'fill-slate-500 dark:fill-slate-300'}
                >
                  {dir}
                </text>
              );
            })}

            {/* speed arc */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
              className="text-slate-400/20"
              pathLength={100}
              strokeDasharray="75 100"
              transform="rotate(135 100 100)"
            />
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="url(#windArcGradient)"
              strokeWidth="5"
              strokeLinecap="round"
              pathLength={100}
              strokeDasharray={`${Math.max(1, speedRatio * 75)} 100`}
              transform="rotate(135 100 100)"
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)' }}
            />

            {/* direction arrow — points where the air is travelling to */}
            <g
              style={{
                transform: `rotate(${arrowAngle}deg)`,
                transformOrigin: '100px 100px',
                transition: 'transform 1.1s cubic-bezier(0.22,1,0.36,1)',
              }}
            >
              <path d="M100 30 L113 76 L100 68 L87 76 Z" fill="#6366f1" />
              <circle cx="100" cy="100" r="4.5" fill="#6366f1" />
              <line x1="100" y1="100" x2="100" y2="72" stroke="#6366f1" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          </svg>

          <span className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
            to {getWindDirectionText((data.windDirection + 180) % 360)}
          </span>
        </div>

        {/* ------------------------------ details --------------------------- */}
        <div className="grid w-full grid-cols-2 gap-2.5">
          <Row icon={Wind} label="Speed" value={`${data.windSpeed} km/h`} hint={beaufort.description} />
          <Row icon={Compass} label="Direction" value={`${data.windDirectionText} · ${data.windDirection}°`} hint={`from ${longDir}`} />
          <Row icon={Wind} label="Gusts" value={`${data.windGust} km/h`} hint={`Beaufort ${gustBeaufort.scale} · ${gustBeaufort.description}`} />
          <Row icon={Gauge} label="Scale" value={`${beaufort.scale} / 12`} hint="Beaufort" />
        </div>
      </div>

      {/* ---------------------------- beaufort bar -------------------------- */}
      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
          <span>Beaufort scale</span>
          <span>
            {beaufort.scale} — {beaufort.description}
          </span>
        </div>
        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-500/15">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-emerald-400 via-amber-400 to-rose-500 opacity-70" />
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${Math.min(100, (beaufort.scale / 12) * 100)}%` }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-slate-900 shadow-lg dark:border-slate-900 dark:bg-white"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] text-faint">
          <span>Calm</span>
          <span>Breeze</span>
          <span>Strong</span>
          <span>Gale</span>
          <span>Storm</span>
        </div>
      </div>
    </GlassCard>
  );
}

function Row({
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
    <div className="glass-inset p-2.5">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{value}</div>
      {hint && <div className="text-[10px] text-faint">{hint}</div>}
    </div>
  );
}
