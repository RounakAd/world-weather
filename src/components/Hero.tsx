import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { Calendar, CloudSun, Compass, Globe, MapPin, Navigation, Sparkles } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useLocalClock, useWeather } from '../hooks/useWeather';
import GlassCard from './GlassCard';
import EarthGlobe from './EarthGlobe';
import WeatherIcon from './WeatherIcon';
import { formatTemp, getWindDirectionLong } from '../utils/helpers';

export default function Hero() {
  const { selectedCity, unit, summaries } = useWeatherContext();
  const { data } = useWeather(selectedCity);
  const clock = useLocalClock(data?.utcOffsetSeconds);
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 130]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const globeY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : 220]);
  const globeScale = useTransform(scrollYProgress, [0, 1], [1, 1.16]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 120);
    return () => clearTimeout(timer);
  }, []);

  const cityCount = summaries.size || 50;

  const stats = [
    { icon: Globe, value: cityCount, label: 'Cities tracked', suffix: '+' },
    { icon: MapPin, value: 6, label: 'Continents', suffix: '' },
    { icon: Calendar, value: 7, label: 'Day forecast', suffix: '' },
    { icon: CloudSun, value: null, label: 'Live conditions', suffix: '' },
  ];

  return (
    <section ref={sectionRef} className="relative overflow-hidden px-4 pb-16 pt-32 sm:pt-36">
      <motion.div style={{ y: contentY, opacity: contentOpacity }} className="mx-auto max-w-7xl">
        <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* ------------------------------- copy ------------------------------ */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/50 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300"
            >
              <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
              Live global weather intelligence
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.9rem]"
            >
              <span className="text-gradient">Weather around</span>
              <br />
              <span className="text-slate-900 dark:text-white">the world, in real time.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
              className="mt-5 max-w-xl text-base leading-relaxed text-soft sm:text-lg"
            >
              Live temperature, air quality, precipitation and a 7-day outlook for major cities across
              six continents — resolved to each city's own local time.
            </motion.p>

            {/* live city chip */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mt-7 flex flex-wrap items-center gap-3"
            >
              <div className="flex items-center gap-3 rounded-2xl border border-white/50 bg-white/55 px-4 py-2.5 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/50">
                {data ? (
                  <WeatherIcon kind={data.iconKind} size={30} />
                ) : (
                  <span className="text-xl">{selectedCity.flag}</span>
                )}
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                    {selectedCity.name}
                    <span className="text-xs font-normal">{selectedCity.flag}</span>
                  </div>
                  <div className="text-[11px] text-faint">
                    {clock.time} local · {data ? `${formatTemp(data.temperature, unit)} · ${data.condition}` : 'loading…'}
                  </div>
                </div>
              </div>

              {data && (
                <div className="flex items-center gap-2 rounded-2xl border border-white/50 bg-white/55 px-4 py-2.5 text-xs font-medium text-slate-600 backdrop-blur-xl dark:border-slate-700/50 dark:bg-slate-800/50 dark:text-slate-300">
                  <Compass className="h-3.5 w-3.5 text-teal-500" />
                  {getWindDirectionLong(data.windDirection)} · {data.windSpeed} km/h
                </div>
              )}
            </motion.div>

            {/* stats */}
            <div className="mt-9 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat, index) => (
                <GlassCard
                  key={stat.label}
                  tilt={9}
                  className="p-4"
                  style={{ animation: mounted ? `slideUp 0.7s cubic-bezier(0.22,1,0.36,1) ${index * 0.08}s both` : undefined }}
                >
                  <stat.icon className="mb-2 h-5 w-5 text-indigo-500" />
                  <div className="tabular font-display text-2xl font-bold text-slate-900 dark:text-white">
                    {stat.value !== null ? (
                      <>
                        {mounted ? <Counter to={stat.value} /> : 0}
                        {stat.suffix}
                      </>
                    ) : (
                      <span className="flex items-center gap-1.5 text-lg">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        Live
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-faint">
                    {stat.label}
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>

          {/* ------------------------------ 3D globe --------------------------- */}
          <motion.div
            style={{ y: globeY, scale: globeScale }}
            className="relative mx-auto mt-2 aspect-square w-full max-w-[16rem] sm:max-w-[20rem] lg:mt-0 lg:max-w-md"
          >
            <div className="perspective-1600 relative h-full w-full">
              <div className="preserve-3d relative h-full w-full" style={{ transform: 'rotateX(12deg)' }}>
                {/* outer glow */}
                <div className="absolute inset-[6%] rounded-full bg-indigo-500/20 blur-3xl" />

                {/* orbit rings */}
                {[0, 1, 2].map((ring) => (
                  <motion.div
                    key={ring}
                    className="absolute rounded-full border border-white/25 dark:border-slate-400/20"
                    style={{
                      inset: `${ring * 7}%`,
                      transform: `rotateX(72deg) rotateZ(${ring * 22}deg)`,
                    }}
                    animate={reduceMotion ? {} : { rotateZ: [ring * 22, ring * 22 + 360] }}
                    transition={{ duration: 34 + ring * 12, repeat: Infinity, ease: 'linear' }}
                  />
                ))}

                {/* the real Earth — NASA Blue Marble, lit and rotating */}
                <div className="absolute inset-[6%]">
                  <EarthGlobe
                    marker={{ lat: selectedCity.lat, lng: selectedCity.lng, label: selectedCity.name }}
                    maxSize={460}
                  />
                </div>

                {/* orbiting marker */}
                <motion.div
                  className="absolute inset-0"
                  animate={reduceMotion ? {} : { rotate: 360 }}
                  transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
                >
                  <div className="absolute left-1/2 top-[6%] -translate-x-1/2">
                    <span className="grid h-8 w-8 place-items-center rounded-full border border-white/60 bg-white/85 shadow-lg backdrop-blur dark:bg-slate-800/85">
                      <Navigation className="h-4 w-4 text-indigo-500" />
                    </span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

function Counter({ to }: { to: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 1400;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(to * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to]);

  return <>{count}</>;
}
