import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Globe2, Loader2, MapPin, Search, Star, X } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useCitySearch } from '../hooks/useWeather';
import { City } from '../types/weather';
import { formatTempBare, cn } from '../utils/helpers';
import WeatherIcon from './WeatherIcon';

interface CitySearchProps {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}

/**
 * City search with live suggestions.
 *
 * Matches from the bundled 50-city list appear instantly, then Open-Meteo
 * geocoding fills in the rest of the world. Selecting a suggestion loads that
 * city's full weather detail and scrolls the dashboard to it.
 */
export default function CitySearch({ variant = 'desktop', onNavigate }: CitySearchProps) {
  const {
    searchQuery,
    setSearchQuery,
    focusCity,
    summaries,
    recentCities,
    favoriteCities,
    toggleFavorite,
    favorites,
    filteredCities,
  } = useWeatherContext();

  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { results, loading, remote } = useCitySearch(searchQuery, open);

  /* suggestions shown when the field is empty: favourites, then recents */
  const idleSuggestions = useMemo(() => {
    const merged: City[] = [];
    [...favoriteCities, ...recentCities].forEach((city) => {
      if (!merged.some((c) => c.name === city.name && c.countryCode === city.countryCode)) merged.push(city);
    });
    return merged.slice(0, 5);
  }, [favoriteCities, recentCities]);

  const activeList = searchQuery.trim().length > 0 ? results : idleSuggestions;

  /* close on outside click */
  useEffect(() => {
    const handle = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', handle);
    return () => document.removeEventListener('pointerdown', handle);
  }, []);

  useEffect(() => {
    setHighlight(0);
  }, [searchQuery, open]);

  const choose = (city: City) => {
    focusCity(city);
    setOpen(false);
    onNavigate?.();
    inputRef.current?.blur();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlight((prev) => Math.min(prev + 1, activeList.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((prev) => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter') {
      if (open && activeList[highlight]) {
        event.preventDefault();
        choose(activeList[highlight]);
      } else {
        setOpen(false);
        document.getElementById('city-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  const isMobile = variant === 'mobile';

  return (
    <div
      ref={containerRef}
      className={cn('relative', isMobile ? 'w-full' : 'w-full sm:w-52 lg:w-56 xl:focus-within:w-72', 'transition-[width] duration-300')}
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          placeholder="Search any city…"
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          aria-label="Search for a city"
          aria-expanded={open}
          role="combobox"
          className={`w-full rounded-xl border border-white/40 bg-white/55 pl-9 pr-9 text-sm text-slate-900 outline-none backdrop-blur-md transition-colors placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white/80 dark:border-slate-600/40 dark:bg-slate-800/50 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:bg-slate-800/75 ${
            isMobile ? 'py-3' : 'py-2'
          }`}
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          loading && <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-400" />
        )}
      </div>

      <AnimatePresence>
        {open && (activeList.length > 0 || loading || searchQuery.trim().length >= 2) && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute z-50 mt-2 overflow-hidden rounded-2xl border border-white/50 bg-white/85 shadow-glass-lg backdrop-blur-2xl dark:border-slate-700/50 dark:bg-slate-900/90 ${
              isMobile ? 'left-0 right-0' : 'right-0 w-[21rem] lg:w-[23rem]'
            }`}
          >
            {searchQuery.trim().length === 0 && (
              <div className="flex items-center gap-2 border-b border-white/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-faint dark:border-slate-700/40">
                <Clock className="h-3 w-3" /> Recent & favourites
              </div>
            )}

            <div className="max-h-[22rem] overflow-y-auto scrollbar-slim py-1">
              {activeList.map((city, index) => {
                const summary = summaries.get(city.name);
                const isFav = favorites.includes(city.name);
                return (
                  <div
                    key={`${city.name}-${city.countryCode}-${index}`}
                    onMouseEnter={() => setHighlight(index)}
                    className={`group flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors ${
                      highlight === index ? 'bg-indigo-500/10' : 'hover:bg-slate-500/5'
                    }`}
                    onPointerDown={(event) => {
                      event.preventDefault();
                      choose(city);
                    }}
                  >
                    <span className="text-lg leading-none">{city.flag}</span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {city.name}
                        </span>
                        {city.discovered && (
                          <span className="rounded-full bg-teal-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-300">
                            world
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 truncate text-[11px] text-faint">
                        <MapPin className="h-2.5 w-2.5" />
                        {city.admin1 ? `${city.admin1}, ` : ''}
                        {city.country}
                        {summary && <span className="ml-1 tabular">· {summary.localTime}</span>}
                      </div>
                    </div>

                    {summary ? (
                      <div className="flex items-center gap-2">
                        <WeatherIcon kind={summary.iconKind} size={22} still />
                        <span className="tabular text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {formatTempBare(summary.temperature, 'C')}
                        </span>
                      </div>
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-300" />
                    )}

                    <button
                      type="button"
                      aria-label={isFav ? 'Remove favourite' : 'Add favourite'}
                      onPointerDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleFavorite(city.name);
                      }}
                      className="rounded-md p-1 opacity-0 transition-opacity hover:bg-slate-500/10 group-hover:opacity-100"
                    >
                      <Star
                        className={`h-3.5 w-3.5 ${
                          isFav ? 'fill-amber-400 text-amber-400' : 'text-slate-400'
                        }`}
                      />
                    </button>
                  </div>
                );
              })}

              {activeList.length === 0 && !loading && searchQuery.length >= 2 && (
                <div className="px-4 py-6 text-center text-sm text-faint">
                  No cities matched “{searchQuery}”.
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/40 px-3 py-2 text-[11px] text-faint dark:border-slate-700/40">
              <span className="flex items-center gap-1.5">
                {remote ? (
                  <>
                    <Globe2 className="h-3 w-3" /> Worldwide results included
                  </>
                ) : (
                  <>
                    <Globe2 className="h-3 w-3" /> Searching 50 featured cities
                  </>
                )}
              </span>
              {searchQuery.trim().length > 0 && (
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setOpen(false);
                    document.getElementById('city-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="font-semibold text-indigo-500 transition-colors hover:text-indigo-600 dark:text-indigo-300"
                >
                  View {filteredCities.length} in grid ↓
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
