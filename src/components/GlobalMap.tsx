import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Crosshair, Globe2, Minus, Plus, RotateCcw } from 'lucide-react';
import { useWeatherContext } from '../context/WeatherContext';
import GlassCard from './GlassCard';
import { WORLD_LAND_PATHS, WORLD_VIEWBOX, projectToMap } from '../data/worldMap';
import { formatTempBare, temperatureColor } from '../utils/helpers';
import WeatherIcon from './WeatherIcon';
import { City } from '../types/weather';

const MAP_W = 1000;
const MAP_H = 500;

/* -------------------------------------------------------------------------- */
/*  Solar terminator                                                          */
/* -------------------------------------------------------------------------- */

function subsolarPoint(date: Date): { lat: number; lng: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = Math.floor((date.getTime() - start) / 86400000);
  const declination = 23.44 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60;
  const lng = -15 * (utcHours - 12);
  return { lat: declination, lng };
}

function nightPath(subsolarLat: number, subsolarLng: number): string {
  const points: Array<[number, number]> = [];
  const d = (subsolarLat * Math.PI) / 180;
  const tanD = Math.tan(d);

  for (let lon = -180; lon <= 180; lon += 2) {
    const h = ((lon - subsolarLng) * Math.PI) / 180;
    let lat: number;
    if (Math.abs(tanD) < 1e-6) {
      lat = Math.cos(h) > 0 ? 90 : -90;
    } else {
      lat = (Math.atan(-Math.cos(h) / tanD) * 180) / Math.PI;
    }
    const { x, y } = projectToMap(lat, lon);
    points.push([x, y]);
  }

  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return subsolarLat >= 0 ? `${line} L${MAP_W},${MAP_H} L0,${MAP_H} Z` : `${line} L${MAP_W},0 L0,0 Z`;
}

/* -------------------------------------------------------------------------- */

export default function GlobalMap() {
  const { selectedCity, focusCity, unit, summaries, summariesLoading } = useWeatherContext();

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState<City | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const movedRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const sun = useMemo(() => subsolarPoint(new Date()), []);
  const night = useMemo(() => nightPath(sun.lat, sun.lng), [sun]);

  const markers = useMemo(
    () =>
      Array.from(summaries.values()).map((summary) => ({
        summary,
        ...projectToMap(summary.city.lat, summary.city.lng),
      })),
    [summaries],
  );

  const clampPan = useCallback(
    (next: { x: number; y: number }, nextZoom: number) => {
      const maxX = (MAP_W * (nextZoom - 1)) / 2;
      const maxY = (MAP_H * (nextZoom - 1)) / 2;
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [],
  );

  const changeZoom = (delta: number) => {
    setZoom((prev) => {
      const next = Math.min(6, Math.max(1, Number((prev + delta).toFixed(2))));
      setPan((current) => clampPan(current, next));
      return next;
    });
  };

  const reset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y };
    movedRef.current = false;
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = MAP_W / rect.width;
    const scaleY = MAP_H / rect.height;
    const dx = (event.clientX - drag.x) * scaleX;
    const dy = (event.clientY - drag.y) * scaleY;
    if (Math.hypot(dx, dy) > 4) movedRef.current = true;
    setPan(clampPan({ x: drag.panX + dx, y: drag.panY + dy }, zoom));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const hoveredSummary = hovered ? summaries.get(hovered.name) : undefined;
  const temps = markers.map((marker) => marker.summary.temperature);
  const coldest = temps.length ? Math.min(...temps) : 0;
  const hottest = temps.length ? Math.max(...temps) : 0;

  return (
    <GlassCard tilt={2} className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900 dark:text-white">
            <Globe2 className="h-4 w-4 text-indigo-500" />
            Global overview
          </h3>
          <p className="mt-0.5 text-[11px] text-faint">
            Live temperatures across {markers.length || 50} cities · shaded area is night-time
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => changeZoom(-0.5)}
            aria-label="Zoom out"
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/40 bg-white/45 transition-colors hover:bg-white/75 dark:border-slate-700/40 dark:bg-slate-800/45 dark:hover:bg-slate-700/60"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <span className="tabular w-10 text-center text-[11px] font-bold text-soft">
            {zoom.toFixed(1)}×
          </span>
          <button
            type="button"
            onClick={() => changeZoom(0.5)}
            aria-label="Zoom in"
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/40 bg-white/45 transition-colors hover:bg-white/75 dark:border-slate-700/40 dark:bg-slate-800/45 dark:hover:bg-slate-700/60"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={reset}
            aria-label="Reset view"
            className="grid h-8 w-8 place-items-center rounded-xl border border-white/40 bg-white/45 transition-colors hover:bg-white/75 dark:border-slate-700/40 dark:bg-slate-800/45 dark:hover:bg-slate-700/60"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* -------------------------------- map -------------------------------- */}
      <div className="relative overflow-hidden rounded-2xl border border-white/40 bg-gradient-to-b from-sky-100/70 to-indigo-50/60 dark:border-slate-700/40 dark:from-slate-900/70 dark:to-slate-950/70">
        <svg
          ref={svgRef}
          viewBox={WORLD_VIEWBOX}
          className="block aspect-[2/1] w-full cursor-grab touch-none active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <linearGradient id="mapLand" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="rgba(129,140,248,0.62)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.5)" />
            </linearGradient>
            <linearGradient id="mapOcean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.16)" />
              <stop offset="100%" stopColor="rgba(79,70,229,0.1)" />
            </linearGradient>
            <filter id="mapGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width={MAP_W} height={MAP_H} fill="url(#mapOcean)" />

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {/* graticule */}
            <g stroke="currentColor" strokeWidth="0.6" className="text-slate-400/25">
              {Array.from({ length: 11 }).map((_, index) => (
                <line key={`v${index}`} x1={(index * MAP_W) / 12} y1="0" x2={(index * MAP_W) / 12} y2={MAP_H} />
              ))}
              {Array.from({ length: 5 }).map((_, index) => (
                <line key={`h${index}`} x1="0" y1={(index * MAP_H) / 6} x2={MAP_W} y2={(index * MAP_H) / 6} />
              ))}
              <line x1="0" y1={MAP_H / 2} x2={MAP_W} y2={MAP_H / 2} strokeWidth="1" className="text-amber-500/40" />
            </g>

            {/* land */}
            <g>
              {WORLD_LAND_PATHS.map((path, index) => (
                <path
                  key={index}
                  d={path}
                  fill="url(#mapLand)"
                  stroke="currentColor"
                  strokeWidth="0.7"
                  className="text-indigo-500/50 dark:text-indigo-300/45"
                />
              ))}
            </g>

            {/* night side */}
            <path d={night} fill="rgba(9,12,32,0.42)" className="dark:fill-[rgba(2,4,16,0.62)]" />

            {/* city markers — counter-scaled so they keep a constant size */}
            <g>
              {markers.map(({ summary, x, y }) => {
                const isSelected = selectedCity.name === summary.city.name;
                const isHovered = hovered?.name === summary.city.name;
                const colour = temperatureColor(summary.temperature);
                return (
                  <g
                    key={`${summary.city.name}-${summary.city.countryCode}`}
                    transform={`translate(${x} ${y}) scale(${1 / zoom})`}
                    className="cursor-pointer"
                    onPointerEnter={() => setHovered(summary.city)}
                    onPointerLeave={() => setHovered(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (movedRef.current) return;
                      focusCity(summary.city);
                    }}
                  >
                    {isSelected && (
                      <circle r="9" fill="none" stroke={colour} strokeWidth="1.6" className="animate-pulse-ring" />
                    )}
                    <circle
                      r={isSelected || isHovered ? 5.4 : 3.8}
                      fill={colour}
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth={isSelected ? 1.8 : 1.2}
                      style={{ transition: 'r 0.2s ease' }}
                      filter={isSelected ? 'url(#mapGlow)' : undefined}
                    />
                    {(isSelected || isHovered) && (
                      <text
                        y="-9"
                        textAnchor="middle"
                        fontSize="9"
                        fontWeight="700"
                        className="fill-slate-900 dark:fill-white"
                        style={{ paintOrder: 'stroke', stroke: 'rgba(255,255,255,0.85)', strokeWidth: 2.4 }}
                      >
                        {summary.city.name}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>

        {/* hover card */}
        <AnimatePresence>
          {hovered && hoveredSummary && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-center gap-3 rounded-2xl border border-white/50 bg-white/85 p-3 backdrop-blur-xl sm:left-auto sm:right-3 sm:w-64 dark:border-slate-700/50 dark:bg-slate-900/88"
            >
              <WeatherIcon kind={hoveredSummary.iconKind} size={34} still />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-white">
                  {hoveredSummary.city.flag} {hoveredSummary.city.name}
                </div>
                <div className="truncate text-[11px] text-faint">
                  {hoveredSummary.condition} · {hoveredSummary.localTime}
                </div>
              </div>
              <div className="tabular font-display text-lg font-bold text-slate-900 dark:text-white">
                {formatTempBare(hoveredSummary.temperature, unit)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {summariesLoading && markers.length === 0 && (
          <div className="absolute inset-0 grid place-items-center bg-white/30 backdrop-blur-sm dark:bg-slate-950/30">
            <span className="flex items-center gap-2 rounded-full border border-white/50 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 dark:border-slate-700/50 dark:bg-slate-900/80 dark:text-slate-200">
              <Crosshair className="h-3.5 w-3.5 animate-spin" />
              Plotting live temperatures…
            </span>
          </div>
        )}
      </div>

      {/* ------------------------------- legend ------------------------------ */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[220px]">
          <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
            <span>Temperature</span>
            <span className="tabular">
              {markers.length ? `${formatTempBare(coldest, unit)} → ${formatTempBare(hottest, unit)}` : '—'}
            </span>
          </div>
          <div
            className="h-2.5 rounded-full"
            style={{
              background:
                'linear-gradient(90deg, rgb(56,108,214), rgb(74,158,235), rgb(96,200,214), rgb(88,200,140), rgb(232,197,71), rgb(240,138,60), rgb(230,76,76), rgb(168,40,108))',
            }}
          />
          <div className="mt-1 flex justify-between text-[9px] text-faint">
            <span>-20°</span>
            <span>0°</span>
            <span>15°</span>
            <span>30°</span>
            <span>48°C</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] text-faint">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 ring-2 ring-indigo-300/60" /> Selected city
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" /> Other cities
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-slate-900/50" /> Night
          </span>
        </div>
      </div>

      <p className="mt-3 text-[10px] text-faint">
        Drag to pan · use + / − to zoom · click any dot to load that city's full forecast. Day/night shading is
        computed live from the sun's position.
      </p>
    </GlassCard>
  );
}
