# 🌍 World Weather Info

A beautiful, modern weather dashboard showing real-time weather conditions, air quality, and precipitation forecasts for 50 major cities around the world.

![World Weather Info](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-blue) ![Vite](https://img.shields.io/badge/Vite-6-purple)

## ✨ Features

- **50 Cities Worldwide** - Comprehensive coverage across Asia, Europe, North America, South America, Africa, and Oceania
- **Real-time Weather Data** - Powered by Open-Meteo API (free, no API key required)
- **Air Quality Index** - Live AQI data with pollutant breakdown
- **7-Day Forecast** - Detailed daily forecasts with expandable details
- **Hourly Forecast** - 24-hour weather predictions
- **Weather Trends** - Interactive charts for temperature, rainfall, wind, and humidity
- **Rainfall Visualization** - Weekly precipitation charts and statistics
- **Dark/Light Mode** - Premium dark mode with glassmorphism design
- **Celsius/Fahrenheit Toggle** - Switch between units instantly
- **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- **City Search** - Quick search across all 50 cities
- **Continent Filtering** - Filter cities by continent
- **Favorites** - Save your favorite cities
- **GitHub Pages Ready** - One-click deployment via GitHub Actions

## 🚀 Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS
- **Framer Motion** - Smooth animations
- **Recharts** - Interactive charts
- **Lucide React** - Beautiful icons
- **Open-Meteo API** - Free weather API

## 📦 Install & Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 GitHub Pages Deployment

### Option 1: GitHub Actions (Recommended)

1. **Fork or upload this repository to GitHub**

2. **Enable GitHub Pages:**
   - Go to your repository **Settings**
   - Navigate to **Pages** in the sidebar
   - Under **Source**, select **GitHub Actions**

3. **Push to main branch:**
   - The workflow will automatically build and deploy

4. **Access your site:**
   - Your site will be available at: `https://<username>.github.io/<repository-name>/`

### Option 2: Manual Deployment

```bash
# Build the project
npm run build

# The dist folder contains your static files
# Upload to GitHub Pages or any static hosting
```

### Configuring the Base Path

If deploying to a subdirectory (not username.github.io), update `vite.config.ts`:

```typescript
// For: https://username.github.io/my-weather-app/
base: '/my-weather-app/',
```

## ⚙️ Environment Variables

Create a `.env` file if you want to use additional API features:

```env
# Optional: Weather API key (uses Open-Meteo free API by default)
VITE_WEATHER_API_KEY=

# Optional: Air Quality API key (uses Open-Meteo AQI by default)
VITE_AQI_API_KEY=
```

## 🎨 Design

The app features a premium glassmorphism design with:

- Smooth glass effects and backdrop blur
- Gradient backgrounds that adapt to weather conditions
- Animated weather icons
- Responsive grid layouts
- Beautiful chart visualizations
- Dark mode with soft highlights

## 📱 Responsive Breakpoints

- **Mobile**: 320px - 767px (single column)
- **Tablet**: 768px - 1023px (2 columns)
- **Desktop**: 1024px - 1439px (multi-column)
- **Large Desktop**: 1440px+ (full dashboard)

## 🔧 API Integration

The app uses **Open-Meteo** for weather data:

- Current weather conditions
- Hourly forecasts (24 hours)
- 7-day forecasts
- Air quality data (AQI, PM2.5, PM10, etc.)
- Sunrise/sunset times

No API key required! Open-Meteo is free and open source.

## 📁 Project Structure

```
src/
├── components/       # React components
│   ├── Header.tsx
│   ├── Hero.tsx
│   ├── FeaturedWeather.tsx
│   ├── WeatherMetrics.tsx
│   ├── HourlyForecast.tsx
│   ├── SevenDayForecast.tsx
│   ├── AirQuality.tsx
│   ├── WindCard.tsx
│   ├── SunMoon.tsx
│   ├── WeatherTrends.tsx
│   ├── PrecipitationChart.tsx
│   ├── WeatherAdvice.tsx
│   ├── CityCard.tsx
│   ├── CityGrid.tsx
│   ├── GlobalMap.tsx
│   └── Footer.tsx
├── context/          # React context
├── data/             # Static data
├── hooks/            # Custom hooks
├── services/         # API services
├── types/            # TypeScript types
└── utils/            # Utility functions
```

## 🌟 Credits

- Weather data: [Open-Meteo](https://open-meteo.com/)
- Icons: [Lucide React](https://lucide.dev/)
- Charts: [Recharts](https://recharts.org/)

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

Built with ❤️ for weather enthusiasts worldwide
