import { motion, useScroll, useSpring } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { WeatherProvider, useWeatherContext } from './context/WeatherContext';
import { useWeather } from './hooks/useWeather';
import ParallaxBackground from './components/ParallaxBackground';
import Header from './components/Header';
import Hero from './components/Hero';
import FavoritesBar from './components/FavoritesBar';
import FeaturedWeather from './components/FeaturedWeather';
import WorldClocks from './components/WorldClocks';
import HourlyForecast from './components/HourlyForecast';
import SevenDayForecast from './components/SevenDayForecast';
import WeatherTrends from './components/WeatherTrends';
import PrecipitationChart from './components/PrecipitationChart';
import AirQuality from './components/AirQuality';
import WindCard from './components/WindCard';
import SunMoon from './components/SunMoon';
import WeatherAdvice from './components/WeatherAdvice';
import GlobalMap from './components/GlobalMap';
import CityGrid from './components/CityGrid';
import Footer from './components/Footer';

function AppShell() {
  const { selectedCity, theme } = useWeatherContext();
  const { data } = useWeather(selectedCity);

  const condition = data?.condition ?? 'Partly Cloudy';
  const isDay = data?.isDay ?? true;

  return (
    <div className="relative min-h-screen">
      <ParallaxBackground condition={condition} isDay={isDay} theme={theme} />
      <ScrollProgress />
      <Header />

      <main className="relative">
        <Hero />
        <FavoritesBar />
        <FeaturedWeather />
        <WorldClocks />

        <section id="forecast" className="scroll-mt-28 px-4 py-6">
          <div className="mx-auto max-w-7xl space-y-5">
            <SectionHeading
              eyebrow="Hour by hour"
              title="Forecast timeline"
              description={`Local-time forecasts for ${selectedCity.name} — every timestamp resolved to the city's own timezone.`}
            />
            <HourlyForecast />
            <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
              <SevenDayForecast />
              <PrecipitationChart />
            </div>
          </div>
        </section>

        <section id="insights" className="scroll-mt-28 px-4 py-6">
          <div className="mx-auto max-w-7xl space-y-5">
            <SectionHeading
              eyebrow="Deeper signals"
              title="Air, wind, sun & trends"
              description="Air quality, wind behaviour, daylight geometry and multi-day trends at a glance."
            />

            <div className="grid gap-5 lg:grid-cols-3">
              <WeatherAdvice />
              <AirQuality />
              <div className="space-y-5">
                <WindCard />
                <SunMoon />
              </div>
            </div>

            <WeatherTrends />
            <GlobalMap />
          </div>
        </section>

        <CityGrid />
      </main>

      <Footer />
      <BackToTop />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="max-w-2xl"
    >
      <span className="section-label">{eyebrow}</span>
      <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-soft">{description}</p>
    </motion.div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const width = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });

  return (
    <motion.div
      style={{ scaleX: width }}
      className="fixed inset-x-0 top-0 z-[60] h-0.5 origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500"
    />
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handle = () => setVisible(window.scrollY > 900);
    window.addEventListener('scroll', handle, { passive: true });
    return () => window.removeEventListener('scroll', handle);
  }, []);

  if (!visible) return null;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-6 right-6 z-50 grid h-11 w-11 place-items-center rounded-2xl border border-white/50 bg-white/70 shadow-glass-lg backdrop-blur-xl transition-transform duration-300 hover:-translate-y-1 dark:border-slate-700/50 dark:bg-slate-800/70"
    >
      <ArrowUp className="h-4 w-4 text-indigo-500" />
    </motion.button>
  );
}

export default function App() {
  return (
    <WeatherProvider>
      <AppShell />
    </WeatherProvider>
  );
}
