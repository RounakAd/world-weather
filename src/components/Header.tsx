import { useState, useEffect } from 'react';
import { Globe, Search, Sun, Moon, Thermometer, Menu, X } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { continents } from '../data/cities';

export default function Header() {
  const {
    unit,
    toggleUnit,
    theme,
    toggleTheme,
    searchQuery,
    setSearchQuery,
    selectedContinent,
    setSelectedContinent,
  } = useWeatherContext();

  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shadow-lg'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Globe className="w-8 h-8 text-indigo-500" />
            <span className="text-lg font-bold bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
              World Weather Info
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 w-48 focus:w-64 transition-all outline-none text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Continent filters */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
              {['All Cities', ...continents].map((continent) => (
                <button
                  key={continent}
                  onClick={() => setSelectedContinent(continent)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedContinent === continent
                      ? 'bg-white dark:bg-slate-700 text-indigo-500 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {continent === 'All Cities' ? '🌍' : ''} {continent}
                </button>
              ))}
            </div>

            {/* Unit toggle */}
            <button
              onClick={toggleUnit}
              className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
            >
              <Thermometer className="w-4 h-4" />
              <span className="text-sm font-medium">°{unit}</span>
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Sun className="w-5 h-5 text-amber-500" />
              )}
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-4 border-t border-slate-200 dark:border-slate-800">
            {/* Mobile search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-0 outline-none"
              />
            </div>

            {/* Mobile continent filters */}
            <div className="flex flex-wrap gap-2">
              {['All Cities', ...continents].map((continent) => (
                <button
                  key={continent}
                  onClick={() => {
                    setSelectedContinent(continent);
                    setMobileMenuOpen(false);
                  }}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedContinent === continent
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                >
                  {continent}
                </button>
              ))}
            </div>

            {/* Mobile controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggleUnit}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800"
              >
                <Thermometer className="w-4 h-4" />
                <span className="text-sm font-medium">°{unit}</span>
              </button>
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
