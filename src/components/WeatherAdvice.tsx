import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';
import { generateWeatherSummary, generateWeatherAdvice } from '../utils/helpers';

export default function WeatherAdvice() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  if (loading || !data) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const summary = generateWeatherSummary(data);
  const advice = generateWeatherAdvice(data);

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Lightbulb className="w-5 h-5 text-amber-500" />
        Today's Outlook
      </h3>

      {/* Summary */}
      <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl mb-4">
        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Advice chips */}
      {advice.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Recommendations</h4>
          <div className="flex flex-wrap gap-2">
            {advice.map((item, index) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-2 px-3 py-2 glass-card-hover rounded-xl text-sm"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-slate-700 dark:text-slate-300">{item.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
