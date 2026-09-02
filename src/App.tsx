import { WeatherProvider } from './context/WeatherContext';
import Header from './components/Header';
import Hero from './components/Hero';
import FeaturedWeather from './components/FeaturedWeather';
import HourlyForecast from './components/HourlyForecast';
import SevenDayForecast from './components/SevenDayForecast';
import WeatherMetrics from './components/WeatherMetrics';
import WeatherTrends from './components/WeatherTrends';
import PrecipitationChart from './components/PrecipitationChart';
import AirQuality from './components/AirQuality';
import WindCard from './components/WindCard';
import SunMoon from './components/SunMoon';
import WeatherAdvice from './components/WeatherAdvice';
import GlobalMap from './components/GlobalMap';
import CityGrid from './components/CityGrid';
import Footer from './components/Footer';

function App() {
  return (
    <WeatherProvider>
      <div className="min-h-screen">
        <Header />
        <main>
          <Hero />
          <FeaturedWeather />
          <HourlyForecast />

          {/* Two-column layout for details */}
          <section className="py-8 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <SevenDayForecast />
                  <PrecipitationChart />
                  <WeatherTrends />
                </div>
                <div className="space-y-6">
                  <WeatherAdvice />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <AirQuality />
                    <WindCard />
                  </div>
                  <SunMoon />
                  <GlobalMap />
                </div>
              </div>
            </div>
          </section>

          <CityGrid />
        </main>
        <Footer />
      </div>
    </WeatherProvider>
  );
}

export default App;
