import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import { cities } from '../data/cities';
import { formatTemp } from '../utils/helpers';

// Simplified world map visualization
export default function GlobalMap() {
  const { selectedCity, setSelectedCity, unit } = useWeatherContext();

  // Convert lat/lng to approximate x/y position on a simplified world map
  const positionMap = useMemo(() => {
    // Map bounds: lat -90 to 90, lng -180 to 180
    // Map to 0-100 for x (lng), 0-50 for y (lat inverted)
    const mapWidth = 100;
    const mapHeight = 50;

    return cities.map(city => ({
      city,
      x: ((city.lng + 180) / 360) * mapWidth,
      y: ((90 - city.lat) / 180) * mapHeight,
    }));
  }, []);

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">🌍 Global Overview</h3>

      {/* Simplified world map visualization */}
      <div className="relative bg-gradient-to-b from-blue-100 to-blue-50 dark:from-slate-800 dark:to-slate-900 rounded-xl overflow-hidden aspect-[2/1]">
        {/* Simplified continent shapes */}
        <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 50">
          {/* Simplified world outline */}
          <path
            d="M5,20 Q15,15 25,18 Q35,12 45,15 Q55,10 65,18 Q75,12 85,20 Q90,25 85,30 Q75,35 65,32 Q55,38 45,35 Q35,40 25,35 Q15,38 5,32 Z"
            fill="currentColor"
            className="text-slate-300 dark:text-slate-700"
          />
        </svg>

        {/* City markers */}
        {positionMap.map(({ city, x, y }) => (
          <CityMarker
            key={city.name}
            city={city}
            x={x}
            y={y}
            isSelected={selectedCity.name === city.name}
            onClick={() => setSelectedCity(city)}
            unit={unit}
          />
        ))}
      </div>

      {/* Map legend */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-indigo-500" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-400" />
          <span>Other Cities</span>
        </div>
      </div>
    </div>
  );
}

function CityMarker({
  city,
  x,
  y,
  isSelected,
  onClick,
  unit,
}: {
  city: (typeof cities)[0];
  x: number;
  y: number;
  isSelected: boolean;
  onClick: () => void;
  unit: 'C' | 'F';
}) {
  const { data } = useWeather(city);

  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.3, type: 'spring' }}
      whileHover={{ scale: 1.5 }}
      onClick={onClick}
      className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all ${
        isSelected ? 'z-20' : 'z-10'
      }`}
      style={{ left: `${x}%`, top: `${y}%` }}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-lg transition-all ${
          isSelected
            ? 'bg-indigo-500 text-white ring-2 ring-indigo-300 dark:ring-indigo-600'
            : 'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700'
        }`}
      >
        {isSelected ? (
          <span className="text-lg">{data?.icon || '📍'}</span>
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
        )}
      </div>

      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        <div className="font-semibold text-slate-900 dark:text-white">{city.name}</div>
        {data && (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {data.icon} {formatTemp(data.temperature, unit)}
          </div>
        )}
      </div>
    </motion.button>
  );
}
