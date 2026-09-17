import { motion } from 'framer-motion';
import { Clock, Globe2, Moon, Sun } from 'lucide-react';
import { useMemo } from 'react';
import AnalogClock from './AnalogClock';
import GlassCard from './GlassCard';
import { useWeatherContext } from '../context/WeatherContext';
import { useNow } from '../hooks/useNow';
import { useWeather } from '../hooks/useWeather';
import {
  clockAngles,
  formatLongDate,
  formatOffset,
  formatShortDate,
  formatTime12,
  isDaylightSaving,
  WORLD_ZONES,
  zoneOffsetMinutes,
  zonedTime,
} from '../utils/timezones';

export default function WorldClocks() {
  const { selectedCity, unit } = useWeatherContext();
  const { data } = useWeather(selectedCity);
  const now = useNow();

  /* The selected city's own zone, straight from the API response. */
  const cityZone = data?.timezone || selectedCity.timezone || 'UTC';

  const city = useMemo(() => {
    const z = zonedTime(now, cityZone);
    const offset = zoneOffsetMinutes(now, cityZone);
    return {
      z,
      offset,
      angles: clockAngles(z),
      time: formatTime12(z.hour, z.minute, z.second),
      date: formatLongDate(z),
      dst: isDaylightSaving(now, cityZone),
    };
  }, [now, cityZone]);

  const zones = useMemo(
    () =>
      WORLD_ZONES.map((zone) => {
        const z = zonedTime(now, zone.id);
        return {
          zone,
          z,
          angles: clockAngles(z),
          time: formatTime12(z.hour, z.minute, z.second),
          date: formatShortDate(z),
          offset: zoneOffsetMinutes(now, zone.id),
          dst: isDaylightSaving(now, zone.id),
          isDay: z.hour >= 6 && z.hour < 18,
        };
      }),
    [now],
  );

  return (
    <section id="world-clocks" className="scroll-mt-28 px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="section-label">Live world time</span>
          <h2 className="mt-1 font-display text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">
            World clocks
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-soft">
            {selectedCity.name}'s local time, plus ten reference timezones — every hand driven by the
            browser's timezone database, so daylight saving is applied automatically.
          </p>
        </motion.div>

        {/* ---------------------- big clock: selected city ---------------------- */}
        <GlassCard tilt={3} className="p-5 sm:p-6">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              background:
                'radial-gradient(90% 70% at 18% 0%, rgba(99,102,241,0.16), transparent 62%), radial-gradient(70% 60% at 92% 100%, rgba(56,189,248,0.14), transparent 60%)',
            }}
          />

          <div className="relative flex flex-col items-center">
            {/* city heading */}
            <div className="mb-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
              <span className="text-2xl leading-none">{data?.flag ?? selectedCity.flag}</span>
              <h3 className="font-display text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
                {selectedCity.name}
              </h3>
              <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">
                {cityZone.split('/').pop()?.replace(/_/g, ' ') ?? 'Local'}
              </span>
              {city.dst && (
                <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                  DST active
                </span>
              )}
            </div>

            <AnalogClock
              hour={city.angles.hour}
              minute={city.angles.minute}
              second={city.angles.second}
              size={236}
              accent="#6366f1"
              allNumerals
              label={`Current time in ${selectedCity.name}`}
            />

            {/* digital readout */}
            <div className="mt-4 text-center">
              <div className="tabular font-display text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl dark:text-white">
                {city.time}
              </div>
              <div className="mt-1.5 text-sm text-soft">{city.date}</div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <span className="chip tabular">{formatOffset(city.offset)}</span>
                <span className="chip">{data?.timezoneAbbr || 'local time'}</span>
                {data && (
                  <span className="chip">
                    {data.temperature}°{unit === 'C' ? 'C' : 'F'} · {data.condition}
                  </span>
                )}
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ------------------------- ten reference zones ------------------------ */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {zones.map((entry, index) => (
            <motion.div
              key={entry.zone.id}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.4), ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard tilt={9} className="h-full p-4">
                {/* header */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-display text-base font-bold text-slate-900 dark:text-white">
                        {entry.zone.label}
                      </span>
                      <span className="text-xs leading-none">{entry.zone.flag}</span>
                    </div>
                    <div className="mt-0.5 truncate text-[10px] text-faint" title={entry.zone.name}>
                      {entry.zone.name}
                    </div>
                  </div>

                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-slate-500/10"
                    title={entry.isDay ? 'Daytime' : 'Night'}
                  >
                    {entry.isDay ? (
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </span>
                </div>

                {/* clock */}
                <div className="flex justify-center">
                  <AnalogClock
                    hour={entry.angles.hour}
                    minute={entry.angles.minute}
                    second={entry.angles.second}
                    size={116}
                    accent={entry.isDay ? '#f59e0b' : '#818cf8'}
                    label={`Current time in ${entry.zone.label}`}
                  />
                </div>

                {/* digital readout below the clock */}
                <div className="mt-3 text-center">
                  <div className="tabular font-display text-lg font-bold leading-tight text-slate-900 dark:text-white">
                    {entry.time}
                  </div>
                  <div className="mt-0.5 text-[10px] text-faint">{entry.date}</div>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                    <span className="tabular rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-soft">
                      {formatOffset(entry.offset)}
                    </span>
                    {entry.dst && (
                      <span
                        className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300"
                        title={`Standard offset is ${formatOffset(entry.zone.standardOffset)}`}
                      >
                        DST
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 border-t border-white/30 pt-2 text-center text-[9px] leading-snug text-faint dark:border-slate-700/30">
                  {entry.zone.cities}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-faint">
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            Clocks tick every second — hour and minute hands move continuously.
          </span>
          <span className="flex items-center gap-1.5">
            <Globe2 className="h-3 w-3" />
            Zone labels are the standard names; the offset shown is the live one, so a "DST" tag means the
            zone is currently an hour ahead of its standard time.
          </span>
        </div>
      </div>
    </section>
  );
}
