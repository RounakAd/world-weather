import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { LayoutGrid, Search, SlidersHorizontal } from 'lucide-react';
import CityCard from './CityCard';
import GlassCard from './GlassCard';
import { useWeatherContext } from '../context/WeatherContext';
import { cn } from '../utils/helpers';

type SortKey = 'default' | 'temp-desc' | 'temp-asc' | 'aqi' | 'rain' | 'name';

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: 'default', label: 'Featured order' },
  { key: 'temp-desc', label: 'Hottest first' },
  { key: 'temp-asc', label: 'Coldest first' },
  { key: 'aqi', label: 'Cleanest air' },
  { key: 'rain', label: 'Rainiest first' },
  { key: 'name', label: 'A → Z' },
];

export default function CityGrid() {
  const { filteredCities, searchQuery, selectedContinent, summaries, summariesLoading } = useWeatherContext();
  const [sort, setSort] = useState<SortKey>('default');

  const displayCities = useMemo(() => {
    if (sort === 'default') return filteredCities;
    const list = [...filteredCities];
    switch (sort) {
      case 'temp-desc':
        return list.sort(
          (a, b) => (summaries.get(b.name)?.temperature ?? -99) - (summaries.get(a.name)?.temperature ?? -99),
        );
      case 'temp-asc':
        return list.sort(
          (a, b) => (summaries.get(a.name)?.temperature ?? 99) - (summaries.get(b.name)?.temperature ?? 99),
        );
      case 'aqi':
        return list.sort((a, b) => (summaries.get(a.name)?.aqi ?? 999) - (summaries.get(b.name)?.aqi ?? 999));
      case 'rain':
        return list.sort(
          (a, b) =>
            (summaries.get(b.name)?.rainProbability ?? 0) - (summaries.get(a.name)?.rainProbability ?? 0),
        );
      case 'name':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      default:
        return list;
    }
  }, [filteredCities, sort, summaries]);

  const heading = searchQuery.trim()
    ? `Search results for “${searchQuery.trim()}”`
    : selectedContinent !== 'All Cities'
      ? selectedContinent
      : 'All cities';

  const warmest = useMemo(() => {
    const withData = filteredCities
      .map((city) => summaries.get(city.name))
      .filter((summary): summary is NonNullable<typeof summary> => !!summary);
    if (withData.length === 0) return null;
    return withData.reduce((best, item) => (item.temperature > best.temperature ? item : best), withData[0]);
  }, [filteredCities, summaries]);

  return (
    <section id="city-grid" className="scroll-mt-28 px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-slate-900 dark:text-white">
              <LayoutGrid className="h-5 w-5 text-indigo-500" />
              {heading}
              <span className="text-base font-normal text-faint">({displayCities.length})</span>
            </h2>
            <p className="mt-1 text-xs text-faint">
              {summariesLoading
                ? 'Loading live conditions…'
                : warmest
                  ? `Warmest right now: ${warmest.city.flag} ${warmest.city.name} at ${warmest.temperature}°C`
                  : 'Live conditions across the network'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-faint" />
            <div className="relative">
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortKey)}
                aria-label="Sort cities"
                className="appearance-none rounded-xl border border-white/45 bg-white/55 py-2 pl-3 pr-8 text-xs font-medium text-slate-700 outline-none backdrop-blur-md transition-colors hover:bg-white/80 dark:border-slate-700/45 dark:bg-slate-800/55 dark:text-slate-200 dark:hover:bg-slate-700/60"
              >
                {SORTS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-faint">▾</span>
            </div>
          </div>
        </div>

        {displayCities.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Search className="mx-auto mb-4 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <h3 className="mb-1 font-display text-lg font-bold text-slate-700 dark:text-slate-300">
              No cities found
            </h3>
            <p className="text-sm text-faint">
              Try a different search term or pick another continent filter.
            </p>
          </GlassCard>
        ) : (
          <motion.div layout className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {displayCities.map((city, index) => (
                <motion.div
                  key={`${city.name}-${city.countryCode}`}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  transition={{ duration: 0.3 }}
                >
                  <CityCard city={city} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        <p className={cn('mt-6 text-center text-[11px] text-faint')}>
          Tap any card to load that city's full forecast above. Weather data by Open-Meteo, updated every
          10 minutes.
        </p>
      </div>
    </section>
  );
}
