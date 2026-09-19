import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, Droplets, TrendingUp, Umbrella } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import GlassCard from './GlassCard';
import { GlassTooltip } from './WeatherTrends';
import { describeRainEta } from '../utils/helpers';

export default function PrecipitationChart() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  const stats = useMemo(() => {
    if (!data) return null;
    const weekly = data.forecast.map((day) => ({
      label: day.isToday ? 'Today' : day.day,
      rainfall: day.rainfall,
      probability: day.rainProb,
    }));
    const total = weekly.reduce((sum, day) => sum + day.rainfall, 0);
    const wettest = weekly.reduce((max, day) => (day.rainfall > max.rainfall ? day : max), weekly[0]);
    const highestProb = weekly.reduce((max, day) => (day.probability > max.probability ? day : max), weekly[0]);
    const rainyDays = weekly.filter((day) => day.rainfall > 0).length;

    const hourly = data.hourly.slice(0, 24).map((hour) => ({
      label: hour.isNow ? 'Now' : hour.label,
      probability: hour.precipProb,
      rainfall: hour.rainfall,
    }));

    return { weekly, total, wettest, highestProb, rainyDays, hourly };
  }, [data]);

  if (loading || !data || !stats) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-52 rounded-lg bg-slate-500/15" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-2xl bg-slate-500/15" />
            ))}
          </div>
          <div className="h-56 rounded-2xl bg-slate-500/15" />
        </div>
      </GlassCard>
    );
  }

  const maxRain = Math.max(1, ...stats.weekly.map((day) => day.rainfall));

  return (
    <GlassCard tilt={2} className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
            <Droplets className="h-4 w-4 text-sky-500" />
            Rain &amp; precipitation
          </h3>
          <p className="mt-0.5 text-[11px] text-faint">
            {data.nextRain
              ? `Next rain chance ${describeRainEta(data.nextRain, data.todayRain.currentlyRaining)} (${
                  data.nextRain.precipProb
                }%)`
              : 'No rain expected in the next 48 hours'}
          </p>
        </div>
        <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
          {stats.rainyDays} rainy {stats.rainyDays === 1 ? 'day' : 'days'} ahead
        </span>
      </div>

      {/* summary stats */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Droplets} label="Weekly total" value={`${stats.total.toFixed(1)} mm`} hint="next 7 days" tone="text-sky-500" />
        <StatCard icon={TrendingUp} label="Wettest day" value={stats.wettest.label} hint={`${stats.wettest.rainfall} mm`} tone="text-indigo-500" />
        <StatCard icon={Umbrella} label="Highest chance" value={stats.highestProb.label} hint={`${stats.highestProb.probability}%`} tone="text-cyan-500" />
        <StatCard icon={CalendarDays} label="Rainy days" value={`${stats.rainyDays}`} hint="this week" tone="text-blue-500" />
      </div>

      {/* daily rainfall + probability */}
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={stats.weekly} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="rainBarGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={46} />
            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickLine={false} axisLine={false} width={38} />
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
            <Bar dataKey="rainfall" name="Rainfall (mm)" radius={[6, 6, 0, 0]} maxBarSize={38}>
              {stats.weekly.map((entry, index) => (
                <Cell key={index} fill="url(#rainBarGradient)" fillOpacity={0.35 + 0.65 * (entry.rainfall / maxRain)} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="probability"
              name="Chance (%)"
              stroke="#a855f7"
              strokeWidth={2.2}
              dot={{ r: 3, fill: '#a855f7', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* next 24 hours */}
      <div className="mt-5">
        <h4 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-soft">
          <Umbrella className="h-3.5 w-3.5 text-sky-500" />
          Next 24 hours — precipitation probability
        </h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.hourly} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="hourlyRainGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 4" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} width={42} />
              <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(148,163,184,0.12)' }} />
              <Bar dataKey="probability" name="Chance (%)" fill="url(#hourlyRainGradient)" radius={[4, 4, 0, 0]} maxBarSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GlassCard>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className="glass-inset p-3"
    >
      <Icon className={`mb-1.5 h-4 w-4 ${tone}`} />
      <div className="tabular font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">
        {value}
      </div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">{label}</div>
      {hint && <div className="mt-0.5 text-[10px] text-faint">{hint}</div>}
    </motion.div>
  );
}
