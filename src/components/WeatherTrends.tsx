import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Droplets, Gauge, Thermometer, Wind } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import GlassCard from './GlassCard';
import { convertTemp } from '../utils/helpers';

type Range = '24h' | '7d';

export default function WeatherTrends() {
  const { selectedCity, unit, theme } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);
  const [range, setRange] = useState<Range>('7d');

  const datasets = useMemo(() => {
    if (!data) return null;

    if (range === '24h') {
      const slice = data.hourly.slice(0, 24);
      return {
        temperature: slice.map((hour) => ({
          label: hour.isNow ? 'Now' : hour.label,
          temp: convertTemp(hour.temp, unit),
          feels: convertTemp(hour.feelsLike, unit),
        })),
        rain: slice.map((hour) => ({
          label: hour.isNow ? 'Now' : hour.label,
          rainfall: hour.rainfall,
          probability: hour.precipProb,
        })),
        wind: slice.map((hour) => ({
          label: hour.isNow ? 'Now' : hour.label,
          wind: hour.wind,
          gust: hour.windGust,
        })),
        humidity: slice.map((hour) => ({
          label: hour.isNow ? 'Now' : hour.label,
          humidity: hour.humidity,
          dew: Math.round(hour.dewPoint),
        })),
      };
    }

    return {
      temperature: data.forecast.map((day) => ({
        label: day.isToday ? 'Today' : day.day,
        high: convertTemp(day.tempMax, unit),
        low: convertTemp(day.tempMin, unit),
      })),
      rain: data.forecast.map((day) => ({
        label: day.isToday ? 'Today' : day.day,
        rainfall: day.rainfall,
        probability: day.rainProb,
      })),
      wind: data.forecast.map((day) => ({
        label: day.isToday ? 'Today' : day.day,
        wind: day.windSpeed,
        gust: day.windGust,
      })),
      humidity: data.forecast.map((day) => ({
        label: day.isToday ? 'Today' : day.day,
        humidity: day.humidity,
        dew: Math.round(day.tempMin - (100 - day.humidity) / 5),
      })),
    };
  }, [data, range, unit]);

  if (loading || !data || !datasets) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 rounded-lg bg-slate-500/15" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-44 rounded-2xl bg-slate-500/15" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  const accent = theme === 'dark' ? '#a5b4fc' : '#4f46e5';

  return (
    <GlassCard tilt={2} className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-900 dark:text-white">Weather trends</h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Temperature, rain, wind and humidity for {data.city}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/40 bg-white/40 p-1 dark:border-slate-700/40 dark:bg-slate-800/40">
          {(['24h', '7d'] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setRange(option)}
              className={`relative rounded-lg px-3 py-1 text-[11px] font-semibold transition-colors ${
                range === option ? 'text-white' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              {range === option && (
                <motion.span
                  layoutId="trend-range"
                  className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative">{option === '24h' ? 'Next 24h' : '7 days'}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <TrendChart
          title="Temperature"
          icon={Thermometer}
          unit={`°${unit}`}
          data={datasets.temperature}
        >
          {range === '7d' ? (
            <>
              <Area
                type="monotone"
                dataKey="high"
                stroke="none"
                fill={accent}
                fillOpacity={0.12}
                isAnimationActive
              />
              <Line
                type="monotone"
                dataKey="high"
                name="High"
                stroke="#f97316"
                strokeWidth={2.4}
                dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="low"
                name="Low"
                stroke="#38bdf8"
                strokeWidth={2.4}
                dot={{ r: 3, fill: '#38bdf8', strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </>
          ) : (
            <>
              <Area
                type="monotone"
                dataKey="temp"
                name="Temperature"
                stroke="#f97316"
                strokeWidth={2.4}
                fill="#f97316"
                fillOpacity={0.18}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="feels"
                name="Feels like"
                stroke="#a855f7"
                strokeWidth={1.8}
                strokeDasharray="4 3"
                dot={false}
              />
            </>
          )}
        </TrendChart>

        <TrendChart title="Rainfall" icon={Droplets} unit="mm / %" data={datasets.rain}>
          <Bar dataKey="rainfall" name="Rainfall (mm)" fill="#3b82f6" fillOpacity={0.75} radius={[4, 4, 0, 0]} maxBarSize={26} />
          <Line
            type="monotone"
            dataKey="probability"
            name="Chance (%)"
            stroke="#a855f7"
            strokeWidth={2}
            dot={{ r: 2.5, fill: '#a855f7', strokeWidth: 0 }}
          />
        </TrendChart>

        <TrendChart title="Wind" icon={Wind} unit="km/h" data={datasets.wind}>
          <Area
            type="monotone"
            dataKey="wind"
            name="Wind"
            stroke="#10b981"
            strokeWidth={2.2}
            fill="#10b981"
            fillOpacity={0.18}
          />
          <Line
            type="monotone"
            dataKey="gust"
            name="Gusts"
            stroke="#f59e0b"
            strokeWidth={1.8}
            strokeDasharray="4 3"
            dot={false}
          />
        </TrendChart>

        <TrendChart title="Humidity" icon={Gauge} unit="%" data={datasets.humidity}>
          <Area
            type="monotone"
            dataKey="humidity"
            name="Humidity"
            stroke="#8b5cf6"
            strokeWidth={2.2}
            fill="#8b5cf6"
            fillOpacity={0.18}
          />
          <Line
            type="monotone"
            dataKey="dew"
            name="Dew point (°C)"
            stroke="#14b8a6"
            strokeWidth={1.8}
            strokeDasharray="4 3"
            dot={false}
          />
        </TrendChart>
      </div>

      <p className="mt-3 text-[10px] text-faint">
        Showing {range === '24h' ? `${datasets.temperature.length} hours in ${data.city}'s local time` : 'the next 7 days'} · units follow your °{unit} setting.
      </p>
    </GlassCard>
  );
}

function TrendChart({
  title,
  icon: Icon,
  unit,
  data,
  children,
}: {
  title: string;
  icon: typeof Thermometer;
  unit: string;
  data: Array<Record<string, string | number>>;
  children: React.ReactNode;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] text-soft">
          <Icon className="h-3.5 w-3.5 text-indigo-500" />
          {title}
        </h4>
        <span className="text-[10px] text-faint">{unit}</span>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 6, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 4" vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<GlassTooltip />} cursor={{ stroke: 'rgba(148,163,184,0.35)', strokeWidth: 1 }} />
            {children}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function GlassTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipPayloadEntry[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/50 bg-white/90 px-3 py-2 text-xs shadow-glass-lg backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-900/90">
      <div className="mb-1 font-bold text-slate-900 dark:text-white">{label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 tabular">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-faint">{entry.name}</span>
          <span className="ml-auto font-semibold text-slate-800 dark:text-slate-200">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export { GlassTooltip };
export type { TooltipPayloadEntry };
