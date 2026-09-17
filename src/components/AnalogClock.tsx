import { memo, useId } from 'react';

interface AnalogClockProps {
  /** Hand angles in degrees. */
  hour: number;
  minute: number;
  second: number;
  /** Rendered size in px. */
  size?: number;
  /** Accent colour for the second hand and hub. */
  accent?: string;
  /** Show 12 numerals instead of just 12/3/6/9. */
  allNumerals?: boolean;
  className?: string;
  label?: string;
}

interface FaceProps {
  uid: string;
  allNumerals: boolean;
}

/**
 * The static parts of the dial — bezel, face, ticks, numerals.
 *
 * Memoised on purpose: eleven of these clocks re-render once a second, and
 * without memoisation React would reconcile roughly a thousand unchanging SVG
 * nodes every tick. Only the three hand groups actually move.
 */
const ClockFace = memo(function ClockFace({ uid, allNumerals }: FaceProps) {
  const id = (name: string) => `${name}-${uid}`;
  const numerals = allNumerals ? Array.from({ length: 12 }, (_, i) => i + 1) : [12, 3, 6, 9];

  return (
    <>
      <defs>
        <radialGradient id={id('face')} cx="0.36" cy="0.3">
          <stop offset="0%" stopColor="rgba(255,255,255,0.96)" />
          <stop offset="62%" stopColor="rgba(241,245,249,0.9)" />
          <stop offset="100%" stopColor="rgba(203,213,225,0.85)" />
        </radialGradient>
        <radialGradient id={id('faceDark')} cx="0.36" cy="0.3">
          <stop offset="0%" stopColor="rgba(51,65,85,0.95)" />
          <stop offset="62%" stopColor="rgba(24,34,54,0.94)" />
          <stop offset="100%" stopColor="rgba(12,18,34,0.96)" />
        </radialGradient>
        <linearGradient id={id('bezel')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
          <stop offset="45%" stopColor="rgba(148,163,184,0.5)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
        </linearGradient>
        <filter id={id('shadow')} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#0f172a" floodOpacity="0.28" />
        </filter>
      </defs>

      {/* bezel */}
      <circle cx="100" cy="100" r="97" fill={`url(#${id('bezel')})`} opacity="0.75" />
      <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1" />

      {/* face — light in light mode, dark in dark mode */}
      <circle cx="100" cy="100" r="92" fill={`url(#${id('face')})`} className="transition-opacity duration-500 dark:opacity-0" />
      <circle cx="100" cy="100" r="92" fill={`url(#${id('faceDark')})`} className="opacity-0 transition-opacity duration-500 dark:opacity-100" />

      {/* minute ticks */}
      {Array.from({ length: 60 }).map((_, i) => {
        const isHour = i % 5 === 0;
        return (
          <line
            key={i}
            x1="100"
            y1={isHour ? 14 : 17}
            x2="100"
            y2={isHour ? 25 : 21}
            stroke="currentColor"
            strokeWidth={isHour ? 2.6 : 1}
            strokeLinecap="round"
            className={isHour ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}
            opacity={isHour ? 0.9 : 0.55}
            transform={`rotate(${i * 6} 100 100)`}
          />
        );
      })}

      {/* numerals */}
      <g className="fill-slate-700 dark:fill-slate-200">
        {numerals.map((n) => {
          const angle = ((n % 12) * 30 - 90) * (Math.PI / 180);
          const x = 100 + 68 * Math.cos(angle);
          const y = 100 + 68 * Math.sin(angle);
          return (
            <text
              key={n}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={allNumerals ? 17 : 20}
              fontWeight="700"
              style={{ fontFamily: 'Sora, Inter, system-ui, sans-serif' }}
            >
              {n}
            </text>
          );
        })}
      </g>

      {/* glass sheen — barely there, just enough to read as a crystal face */}
      <ellipse cx="72" cy="62" rx="34" ry="22" fill="rgba(255,255,255,0.05)" transform="rotate(-28 72 62)" />
    </>
  );
});

/**
 * A real ticking analog clock face.
 *
 * The second hand steps once per second with a short mechanical snap; the hour
 * and minute hands carry the fractional seconds so they creep smoothly instead
 * of jumping a whole division at a time.
 */
export default function AnalogClock({
  hour,
  minute,
  second,
  size = 160,
  accent = '#6366f1',
  allNumerals = false,
  className = '',
  label,
}: AnalogClockProps) {
  const uid = useId().replace(/[:]/g, '');
  const shadow = `url(#shadow-${uid})`;

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label ?? 'Analog clock'}
    >
      <ClockFace uid={uid} allNumerals={allNumerals} />

      {/* hour hand */}
      <g
        style={{
          transform: `rotate(${hour}deg)`,
          transformOrigin: '100px 100px',
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        filter={shadow}
      >
        <rect x="96.6" y="54" width="6.8" height="52" rx="3.4" className="fill-slate-800 dark:fill-slate-100" />
      </g>

      {/* minute hand */}
      <g
        style={{
          transform: `rotate(${minute}deg)`,
          transformOrigin: '100px 100px',
          transition: 'transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
        filter={shadow}
      >
        <rect x="97.9" y="30" width="4.2" height="78" rx="2.1" className="fill-slate-700 dark:fill-slate-200" />
      </g>

      {/* second hand — steps once a second */}
      <g
        style={{
          transform: `rotate(${second}deg)`,
          transformOrigin: '100px 100px',
          transition: 'transform 0.14s cubic-bezier(0.3, 1.6, 0.5, 1)',
        }}
      >
        <rect x="99.1" y="24" width="1.8" height="94" rx="0.9" fill={accent} />
        <circle cx="100" cy="112" r="4.2" fill={accent} />
      </g>

      {/* hub */}
      <circle cx="100" cy="100" r="6.4" className="fill-slate-800 dark:fill-slate-100" />
      <circle cx="100" cy="100" r="2.6" fill={accent} />
    </svg>
  );
}
