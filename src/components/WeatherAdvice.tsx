import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Bike, CloudSun, Footprints, Lightbulb, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useAirQuality, useWeather } from '../hooks/useWeather';
import GlassCard from './GlassCard';
import { generateWeatherAdvice, generateWeatherSummary } from '../utils/helpers';

export default function WeatherAdvice() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);
  const { data: aqi } = useAirQuality(selectedCity);

  const insights = useMemo(() => {
    if (!data) return null;

    const aqiValue = aqi?.aqi ?? 40;

    /* ---- activity verdicts -------------------------------------------- */
    const score = (min: number, max: number, idealRain: number, windLimit: number) => {
      const temp = data.temperature;
      let value = 100;
      if (temp < min) value -= (min - temp) * 5;
      if (temp > max) value -= (temp - max) * 5;
      value -= Math.max(0, data.rainProbability - idealRain) * 0.8;
      value -= Math.max(0, data.windSpeed - windLimit) * 1.2;
      value -= Math.max(0, aqiValue - 80) * 0.5;
      return Math.max(0, Math.min(100, Math.round(value)));
    };

    const activities = [
      { icon: Footprints, label: 'Running', value: score(8, 22, 25, 28) },
      { icon: Bike, label: 'Cycling', value: score(12, 28, 30, 32) },
      { icon: UtensilsCrossed, label: 'Outdoor dining', value: score(18, 30, 15, 22) },
    ];

    /* ---- best outdoor window today (daylight hours only) ---------------- */
    const daylight = data.hourly.slice(0, 24).filter((hour) => hour.isDay);
    const hours = daylight.length >= 3 ? daylight : data.hourly.slice(0, 24);
    let best = { start: hours[0], end: hours[0], comfort: -1 };
    for (let i = 0; i < hours.length - 2; i++) {
      const window = hours.slice(i, i + 3);
      const comfort =
        window.reduce((sum, hour) => {
          const tempPenalty = Math.abs(hour.temp - 22) * 2.2;
          const rainPenalty = hour.precipProb * 0.5;
          const windPenalty = Math.max(0, hour.wind - 20) * 1.4;
          return sum + 100 - tempPenalty - rainPenalty - windPenalty;
        }, 0) / 3;
      if (comfort > best.comfort) best = { start: window[0], end: window[2], comfort };
    }

    return { activities, best, aqiValue };
  }, [data, aqi]);

  if (loading || !data || !insights) {
    return (
      <GlassCard className="p-5">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-36 rounded-lg bg-slate-500/15" />
          <div className="h-20 rounded-2xl bg-slate-500/15" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-10 w-28 rounded-xl bg-slate-500/15" />
            ))}
          </div>
        </div>
      </GlassCard>
    );
  }

  const summary = generateWeatherSummary(data);
  const advice = generateWeatherAdvice(data);

  return (
    <GlassCard tilt={2} className="p-5">
      <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        Today's outlook
      </h3>

      {/* summary */}
      <div className="mb-4 rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/12 to-violet-500/8 p-4">
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{summary}</p>
      </div>

      {/* recommendations */}
      {advice.length > 0 && (
        <div className="mb-5">
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">Recommendations</h4>
          <div className="flex flex-wrap gap-2">
            {advice.map((item, index) => (
              <motion.span
                key={item.text}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.06 }}
                className="flex items-center gap-1.5 rounded-full border border-white/45 bg-white/45 px-3 py-1.5 text-xs font-medium text-slate-700 backdrop-blur-md dark:border-slate-700/45 dark:bg-slate-800/45 dark:text-slate-200"
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.text}
              </motion.span>
            ))}
          </div>
        </div>
      )}

      {/* activity verdicts */}
      <div className="mb-5">
        <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
          Activity suitability
        </h4>
        <div className="grid grid-cols-3 gap-2.5">
          {insights.activities.map((activity, index) => {
            const tone =
              activity.value >= 75
                ? { label: 'Great', color: '#22c55e' }
                : activity.value >= 50
                  ? { label: 'Fair', color: '#eab308' }
                  : { label: 'Poor', color: '#ef4444' };
            return (
              <motion.div
                key={activity.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.07 }}
                className="glass-inset p-3 text-center"
              >
                <activity.icon className="mx-auto mb-1.5 h-4 w-4" style={{ color: tone.color }} />
                <div className="tabular font-display text-lg font-bold leading-none" style={{ color: tone.color }}>
                  {activity.value}
                </div>
                <div className="mt-1 text-[10px] font-medium text-faint">{activity.label}</div>
                <div className="text-[9px] font-semibold" style={{ color: tone.color }}>
                  {tone.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* best window */}
      <div className="glass-inset flex items-center gap-3 p-3.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-teal-500/15">
          <CloudSun className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
            Best time outdoors today
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {insights.best.start.label} → {insights.best.end.label}
            <span className="ml-2 text-[11px] font-medium text-faint">
              {insights.best.start.temp}° · {insights.best.start.precipProb}% rain
            </span>
          </div>
        </div>
        <Sparkles className="h-4 w-4 shrink-0 text-emerald-500" />
      </div>

      {aqi && (
        <p className="mt-3 text-[10px] text-faint">
          Activity scores factor in air quality (AQI {aqi.aqi} — {aqi.category.toLowerCase()}).
        </p>
      )}
    </GlassCard>
  );
}
