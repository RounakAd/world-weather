import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, MapPin, Calendar, CloudSun } from 'lucide-react';

export default function Hero() {
  const [countersVisible, setCountersVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCountersVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { icon: Globe, value: 50, label: 'Cities', suffix: '' },
    { icon: MapPin, value: 6, label: 'Continents', suffix: '' },
    { icon: Calendar, value: 7, label: 'Day Forecast', suffix: '' },
    { icon: CloudSun, value: null, label: 'Live Weather', suffix: '' },
  ];

  return (
    <section className="pt-28 pb-12 px-4">
      <div className="max-w-7xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-6"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              Weather Around the World
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Real-time weather, air quality and precipitation forecasts for 50 major cities.
          </p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={countersVisible ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="glass-card-hover p-6 flex flex-col items-center gap-2"
            >
              <stat.icon className="w-8 h-8 text-indigo-500" />
              <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                {stat.value !== null ? (
                  <Counter to={stat.value} visible={countersVisible} />
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Animated globe visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-12 relative"
        >
          <div className="w-48 h-48 md:w-64 md:h-64 mx-auto relative">
            {/* Animated rings */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute inset-0 rounded-full border-2 border-indigo-200 dark:border-indigo-800"
                style={{
                  transform: `scale(${1 + i * 0.15})`,
                  opacity: 1 - i * 0.25,
                }}
                animate={{
                  scale: [1 + i * 0.15, 1.1 + i * 0.15, 1 + i * 0.15],
                }}
                transition={{
                  duration: 4 + i,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
            {/* Globe emoji */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center text-6xl md:text-8xl"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            >
              🌍
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Counter({ to, visible }: { to: number; visible: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;

    const duration = 1500;
    const steps = 30;
    const increment = to / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= to) {
        setCount(to);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [to, visible]);

  return <>{count}</>;
}
