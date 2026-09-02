import { motion, AnimatePresence } from 'framer-motion';
import CityCard from './CityCard';
import { useWeatherContext } from '../context/WeatherContext';
import { cities } from '../data/cities';
import { Search } from 'lucide-react';

export default function CityGrid() {
  const { filteredCities, searchQuery, selectedContinent } = useWeatherContext();

  const displayCities = searchQuery || selectedContinent !== 'All Cities'
    ? filteredCities
    : cities;

  return (
    <section className="py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            {searchQuery ? (
              <>Search Results <span className="text-slate-400 text-lg font-normal">({filteredCities.length} cities)</span></>
            ) : selectedContinent !== 'All Cities' ? (
              <>{selectedContinent} <span className="text-slate-400 text-lg font-normal">({filteredCities.length} cities)</span></>
            ) : (
              <>All Cities <span className="text-slate-400 text-lg font-normal">(50)</span></>
            )}
          </h2>
        </div>

        {filteredCities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-12 text-center"
          >
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
              No cities found
            </h3>
            <p className="text-slate-500 dark:text-slate-500">
              Try a different search term or continent filter.
            </p>
          </motion.div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {displayCities.map((city, index) => (
                <CityCard key={city.name} city={city} index={index} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}
