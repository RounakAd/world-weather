import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Globe, Menu, Moon, Sun, Thermometer, X } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { continents } from '../data/cities';
import CitySearch from './CitySearch';
import { cn } from '../utils/helpers';

export default function Header() {
  const {
    unit,
    toggleUnit,
    theme,
    toggleTheme,
    selectedContinent,
    setSelectedContinent,
    selectedCity,
    searchQuery,
  } = useWeatherContext();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 24);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [selectedCity.name]);

  const filters = ['All Cities', ...continents];

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        className={cn(
          'mx-auto max-w-7xl rounded-2xl border backdrop-blur-2xl transition-[background-color,box-shadow,border-color] duration-500 ease-silk',
          scrolled
            ? 'border-white/50 bg-white/70 shadow-glass-lg dark:border-slate-700/50 dark:bg-slate-900/65'
            : 'border-transparent bg-transparent',
        )}
      >
        <div className="flex h-16 items-center justify-between gap-3 px-3 sm:px-4">
          {/* Logo */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="group flex shrink-0 items-center gap-2.5"
          >
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 shadow-lg shadow-indigo-500/30">
              <Globe className="h-5 w-5 text-white transition-transform duration-500 group-hover:rotate-[18deg]" />
              <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/40" />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="font-display text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">
                World Weather
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-faint">
                Aurora Glass
              </span>
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-2 xl:flex">
            <div className="hidden items-center gap-1 rounded-xl border border-white/40 bg-white/40 p-1 backdrop-blur-md lg:flex dark:border-slate-700/40 dark:bg-slate-800/40">
              {filters.map((continent) => (
                <button
                  key={continent}
                  type="button"
                  onClick={() => setSelectedContinent(continent)}
                  className={cn(
                    'relative shrink-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors duration-200',
                    selectedContinent === continent
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
                  )}
                >
                  {selectedContinent === continent && (
                    <motion.span
                      layoutId="continent-pill"
                      className="absolute inset-0 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 shadow-md shadow-indigo-500/30"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative flex items-center gap-1">
                    {continent === 'All Cities' ? (
                      <>
                        <Globe className="h-3 w-3" /> All
                      </>
                    ) : (
                      continent
                    )}
                  </span>
                </button>
              ))}
            </div>

            <CitySearch variant="desktop" />

            <button
              type="button"
              onClick={toggleUnit}
              aria-label={`Switch to degrees ${unit === 'C' ? 'Fahrenheit' : 'Celsius'}`}
              className="flex items-center gap-1.5 rounded-xl border border-white/40 bg-white/45 px-3 py-2 text-sm font-semibold text-slate-700 backdrop-blur-md transition-all hover:bg-white/70 dark:border-slate-700/40 dark:bg-slate-800/45 dark:text-slate-200 dark:hover:bg-slate-700/60"
            >
              <Thermometer className="h-4 w-4" />
              °{unit}
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle colour theme"
              className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-white/40 bg-white/45 backdrop-blur-md transition-all hover:bg-white/70 dark:border-slate-700/40 dark:bg-slate-800/45 dark:hover:bg-slate-700/60"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={theme}
                  initial={{ y: 14, opacity: 0, rotate: -40 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: -14, opacity: 0, rotate: 40 }}
                  transition={{ duration: 0.25 }}
                  className="grid place-items-center"
                >
                  {theme === 'light' ? (
                    <Moon className="h-4 w-4 text-slate-700" />
                  ) : (
                    <Sun className="h-4 w-4 text-amber-400" />
                  )}
                </motion.span>
              </AnimatePresence>
            </button>
          </nav>

          {/* Compact controls (tablet + mobile) */}
          <div className="flex items-center gap-2 xl:hidden">
            <div className="hidden w-44 sm:block md:w-56 lg:w-64">
              <CitySearch variant="desktop" />
            </div>
            <button
              type="button"
              onClick={toggleUnit}
              className="flex items-center gap-1 rounded-xl border border-white/40 bg-white/45 px-2.5 py-2 text-xs font-semibold text-slate-700 backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-800/45 dark:text-slate-200"
            >
              °{unit}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle colour theme"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/40 bg-white/45 backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-800/45"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              className="grid h-9 w-9 place-items-center rounded-xl border border-white/40 bg-white/45 backdrop-blur-md sm:hidden dark:border-slate-700/40 dark:bg-slate-800/45"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-white/30 sm:hidden dark:border-slate-700/30"
            >
              <div className="space-y-3 px-3 py-3">
                <CitySearch variant="mobile" onNavigate={() => setMobileMenuOpen(false)} />
                <div className="flex flex-wrap gap-2">
                  {filters.map((continent) => (
                    <button
                      key={continent}
                      type="button"
                      onClick={() => {
                        setSelectedContinent(continent);
                        setMobileMenuOpen(false);
                      }}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                        selectedContinent === continent
                          ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/30'
                          : 'border border-white/40 bg-white/45 text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/45 dark:text-slate-300',
                      )}
                    >
                      {continent}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continent strip for medium screens */}
        <div className="hidden border-t border-white/20 px-3 pb-2 pt-1 xl:hidden lg:block dark:border-slate-700/20">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            {filters.map((continent) => (
              <button
                key={continent}
                type="button"
                onClick={() => setSelectedContinent(continent)}
                className={cn(
                  'shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-medium transition-all',
                  selectedContinent === continent
                    ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white'
                    : 'text-slate-600 hover:bg-white/50 dark:text-slate-400 dark:hover:bg-slate-800/50',
                )}
              >
                {continent}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {searchQuery.trim().length > 0 && (
        <div className="pointer-events-none mx-auto mt-2 max-w-7xl">
          <span className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-3 py-1 text-[11px] font-medium text-slate-600 backdrop-blur-md dark:border-slate-700/40 dark:bg-slate-800/70 dark:text-slate-300">
            Filtering the grid by “{searchQuery}”
          </span>
        </div>
      )}
    </header>
  );
}
