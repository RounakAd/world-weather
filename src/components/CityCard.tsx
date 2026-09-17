import { motion } from 'framer-motion';
import { Droplets, MapPin, Star, Wind } from 'lucide-react';
import { City } from '../types/weather';
import { useWeatherContext } from '../context/WeatherContext';
import GlassCard from './GlassCard';
import WeatherIcon from './WeatherIcon';
import { formatTempBare, getAQIColor, temperatureColor } from '../utils/helpers';

interface CityCardProps {
  city: City;
  index: number;
}

export default function CityCard({ city, index }: CityCardProps) {
  const { focusCity, unit, isFavorite, toggleFavorite, summaries, summariesLoading } = useWeatherContext();
  const summary = summaries.get(city.name);
  const favourite = isFavorite(city.name);

  if (!summary) {
    return (
      <GlassCard className="p-4">
        <div className="animate-pulse space-y-3">
          <div className="flex justify-between">
            <div className="h-5 w-24 rounded-lg bg-slate-500/15" />
            <div className="h-5 w-5 rounded-lg bg-slate-500/15" />
          </div>
          <div className="h-8 w-16 rounded-lg bg-slate-500/15" />
          <div className="h-4 w-20 rounded-lg bg-slate-500/15" />
          <div className="h-3 w-full rounded-lg bg-slate-500/15" />
        </div>
        {!summariesLoading && (
          <p className="mt-2 text-[10px] text-faint">Awaiting live data…</p>
        )}
      </GlassCard>
    );
  }

  const tempColour = temperatureColor(summary.temperature);

  return (
    <GlassCard
      tilt={10}
      asButton
      ariaLabel={`Open weather for ${city.name}`}
      onClick={() => focusCity(city)}
      className="group p-4"
      style={{ animation: `slideUp 0.5s cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 0.03, 0.6)}s both` }}
    >
      {/* header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-bold text-slate-900 dark:text-white">{city.name}</h3>
            <span className="text-sm leading-none">{city.flag}</span>
          </div>
          <div className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-faint">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            {city.country}
            <span className="ml-1 tabular">· {summary.localTime}</span>
          </div>
        </div>

        <span
          role="button"
          tabIndex={0}
          aria-label={favourite ? 'Remove from favourites' : 'Add to favourites'}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(city.name);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.stopPropagation();
              toggleFavorite(city.name);
            }
          }}
          className="shrink-0 rounded-lg p-1 transition-colors hover:bg-slate-500/10"
        >
          <Star className={`h-3.5 w-3.5 ${favourite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`} />
        </span>
      </div>

      {/* temperature */}
      <div className="mb-3 flex items-center gap-3">
        <WeatherIcon kind={summary.iconKind} size={44} still className="shrink-0" />
        <div className="min-w-0">
          <div className="tabular font-display text-2xl font-bold leading-none" style={{ color: tempColour }}>
            {formatTempBare(summary.temperature, unit)}
          </div>
          <div className="mt-0.5 truncate text-[11px] font-medium text-soft">{summary.condition}</div>
        </div>
      </div>

      {/* range bar */}
      <div className="mb-3 flex items-center gap-2 text-[10px]">
        <span className="tabular font-semibold text-sky-600 dark:text-sky-300">
          {formatTempBare(summary.tempMin, unit)}
        </span>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-slate-500/15">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-orange-500 opacity-80" />
        </div>
        <span className="tabular font-bold text-orange-600 dark:text-orange-300">
          {formatTempBare(summary.tempMax, unit)}
        </span>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
        <span className="flex items-center gap-1 text-soft">
          <Wind className="h-2.5 w-2.5 text-cyan-500" />
          {summary.windSpeed} km/h
        </span>
        <span className="flex items-center gap-1 text-soft">
          <Droplets className="h-2.5 w-2.5 text-blue-500" />
          {summary.humidity}%
        </span>
        <span className="flex items-center gap-1 text-soft">
          <span className="text-[10px] leading-none">🌫</span>
          {summary.aqi !== null ? (
            <span className="font-semibold" style={{ color: getAQIColor(summary.aqi) }}>
              AQI {summary.aqi}
            </span>
          ) : (
            <span className="text-faint">AQI —</span>
          )}
        </span>
        <span className="flex items-center gap-1 text-soft">
          <span className="text-[10px] leading-none">🌧</span>
          {summary.rainProbability}%
        </span>
      </div>

      {/* hover affordance */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-transparent"
        initial={{ scaleX: 0 }}
        whileHover={{ scaleX: 1 }}
        transition={{ duration: 0.4 }}
      />
    </GlassCard>
  );
}
