import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';

export default function WeatherTrends() {
  const { selectedCity, unit } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  if (loading || !data) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="grid grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatTemp = (celsius: number) => {
    if (unit === 'F') return Math.round((celsius * 9) / 5 + 32);
    return celsius;
  };

  // Temperature data
  const tempData = data.forecast.map((day) => ({
    day: day.day,
    high: formatTemp(day.tempMax),
    low: formatTemp(day.tempMin),
  }));

  // Rainfall data
  const rainfallData = data.forecast.map((day) => ({
    day: day.day,
    rainfall: day.rainfall,
    probability: day.rainProb,
  }));

  // Wind data
  const windData = data.forecast.map((day) => ({
    day: day.day,
    wind: day.windSpeed,
  }));

  // Humidity data
  const humidityData = data.forecast.map((day) => ({
    day: day.day,
    humidity: day.humidity,
  }));

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📊 Weather Trends</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Temperature Trend */}
        <TrendChart title="Temperature" data={tempData}>
          <Line type="monotone" dataKey="high" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b' }} />
          <Line type="monotone" dataKey="low" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
        </TrendChart>

        {/* Rainfall Trend */}
        <TrendChart title="Rainfall" data={rainfallData}>
          <Area type="monotone" dataKey="rainfall" fill="#3b82f6" fillOpacity={0.3} stroke="#3b82f6" strokeWidth={2} />
        </TrendChart>

        {/* Wind Trend */}
        <TrendChart title="Wind Speed" data={windData}>
          <Area type="monotone" dataKey="wind" fill="#10b981" fillOpacity={0.3} stroke="#10b981" strokeWidth={2} />
        </TrendChart>

        {/* Humidity Trend */}
        <TrendChart title="Humidity" data={humidityData}>
          <Area type="monotone" dataKey="humidity" fill="#8b5cf6" fillOpacity={0.3} stroke="#8b5cf6" strokeWidth={2} />
        </TrendChart>
      </div>
    </div>
  );
}

function TrendChart({ title, data, children }: { title: string; data: unknown[]; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{title}</h4>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            {children}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
