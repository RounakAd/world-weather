import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from 'recharts';
import { Droplets, TrendingUp } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import { useWeather } from '../hooks/useWeather';

export default function PrecipitationChart() {
  const { selectedCity } = useWeatherContext();
  const { data, loading } = useWeather(selectedCity);

  if (loading || !data) {
    return (
      <div className="glass-card p-4">
        <div className="animate-pulse">
          <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
          <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  // Weekly rainfall data
  const weeklyData = data.forecast.map((day) => ({
    day: day.day,
    rainfall: day.rainfall,
    probability: day.rainProb,
  }));

  // Summary stats
  const totalRainfall = weeklyData.reduce((sum, day) => sum + day.rainfall, 0);
  const maxRainfallDay = weeklyData.reduce((max, day) =>
    day.rainfall > max.rainfall ? day : max, weeklyData[0]);
  const maxProbDay = weeklyData.reduce((max, day) =>
    day.probability > max.probability ? day : max, weeklyData[0]);
  const rainyDays = weeklyData.filter((day) => day.rainfall > 0).length;

  return (
    <div className="glass-card p-4">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
        <Droplets className="w-5 h-5 text-blue-500" />
        Rain & Precipitation
      </h3>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          icon={Droplets}
          label="Weekly Total"
          value={`${totalRainfall.toFixed(1)} mm`}
          color="text-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Wettest Day"
          value={maxRainfallDay.day}
          subtext={`${maxRainfallDay.rainfall} mm`}
          color="text-indigo-500"
        />
        <StatCard
          icon={Droplets}
          label="Highest Prob"
          value={maxProbDay.day}
          subtext={`${maxProbDay.probability}%`}
          color="text-cyan-500"
        />
        <StatCard
          icon={Droplets}
          label="Rainy Days"
          value={rainyDays.toString()}
          subtext="this week"
          color="text-blue-500"
        />
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeklyData} margin={{ top: 10, right: 10, bottom: 10, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              label={{ value: 'mm', angle: -90, position: 'insideLeft', fontSize: 12 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Bar dataKey="rainfall" radius={[4, 4, 0, 0]}>
              {weeklyData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.rainfall > 5 ? '#3b82f6' : entry.rainfall > 0 ? '#60a5fa' : '#93c5fd'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Rain probability overlay */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Rain Probability</h4>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-slate-700" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: 'none',
                  borderRadius: '8px',
                }}
              />
              <Line
                type="monotone"
                dataKey="probability"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ fill: '#8b5cf6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  subtext?: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card-hover p-3 text-center"
    >
      <Icon className={`w-5 h-5 ${color} mx-auto mb-1`} />
      <div className="text-lg font-bold text-slate-900 dark:text-white">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      {subtext && <div className="text-xs text-slate-400">{subtext}</div>}
    </motion.div>
  );
}
