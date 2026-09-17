import { motion } from 'framer-motion';
import { Clock3, Star } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import WeatherIcon from './WeatherIcon';
import { formatTempBare } from '../utils/helpers';
import { City, CitySummary, TemperatureUnit } from '../types/weather';

export default function FavoritesBar() {
  const { favoriteCities, recentCities, selectedCity, focusCity, summaries, unit } = useWeatherContext();

  const favourites = favoriteCities.slice(0, 8);
  const recents = recentCities.filter(
    (city) => !favourites.some((fav) => fav.name === city.name && fav.countryCode === city.countryCode),
  ).slice(0, 6);

  if (favourites.length === 0 && recents.length === 0) return null;

  return (
    <section className="px-4 pb-4">
      <div className="mx-auto max-w-7xl space-y-3">
        {favourites.length > 0 && (
          <Row title="Favourites" icon={Star} iconClass="text-amber-500 fill-amber-400">
            {favourites.map((city, index) => (
              <Chip
                key={`fav-${city.name}`}
                city={city}
                index={index}
                active={selectedCity.name === city.name}
                onClick={() => focusCity(city)}
                summary={summaries.get(city.name)}
                unit={unit}
              />
            ))}
          </Row>
        )}

        {recents.length > 0 && (
          <Row title="Recently viewed" icon={Clock3} iconClass="text-indigo-500">
            {recents.map((city, index) => (
              <Chip
                key={`recent-${city.name}`}
                city={city}
                index={index}
                active={selectedCity.name === city.name}
                onClick={() => focusCity(city)}
                summary={summaries.get(city.name)}
                unit={unit}
              />
            ))}
          </Row>
        )}
      </div>
    </section>
  );
}

function Row({
  title,
  icon: Icon,
  iconClass,
  children,
}: {
  title: string;
  icon: typeof Star;
  iconClass: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-faint">
        <Icon className={`h-3 w-3 ${iconClass}`} />
        {title}
      </span>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto scrollbar-hide py-0.5">{children}</div>
    </div>
  );
}

function Chip({
  city,
  index,
  active,
  onClick,
  summary,
  unit,
}: {
  city: City;
  index: number;
  active: boolean;
  onClick: () => void;
  summary?: CitySummary;
  unit: TemperatureUnit;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 ${
        active
          ? 'border-indigo-400/60 bg-gradient-to-r from-indigo-500/20 to-violet-500/15 text-indigo-700 dark:text-indigo-200'
          : 'border-white/45 bg-white/45 text-slate-700 hover:bg-white/75 dark:border-slate-700/45 dark:bg-slate-800/45 dark:text-slate-200'
      }`}
    >
      <span className="text-sm leading-none">{city.flag}</span>
      <span className="max-w-[8rem] truncate font-semibold">{city.name}</span>
      {summary && (
        <>
          <WeatherIcon kind={summary.iconKind} size={18} still />
          <span className="tabular text-[11px] font-bold">{formatTempBare(summary.temperature, unit)}</span>
        </>
      )}
    </motion.button>
  );
}
