import { useId } from 'react';
import { WeatherIconKind } from '../types/weather';

interface WeatherIconProps {
  kind: WeatherIconKind;
  /** Rendered size in px. */
  size?: number;
  className?: string;
  /** Disables the idle animation (used in dense lists). */
  still?: boolean;
  title?: string;
}

/**
 * Hand-built SVG weather icon set. Unlike the emoji it replaces, every glyph
 * is resolved for the correct time of day — a clear night is a moon, a clear
 * midday is a sun, and partly-cloudy flips its celestial body after dusk.
 */
export default function WeatherIcon({ kind, size = 48, className = '', still = false, title }: WeatherIconProps) {
  const uid = useId().replace(/[:]/g, '');
  const id = (name: string) => `${name}-${uid}`;
  const anim = still ? '' : '';

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={title ?? kind}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={id('sun')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffe07a" />
          <stop offset="55%" stopColor="#ffb547" />
          <stop offset="100%" stopColor="#ff8f3f" />
        </linearGradient>
        <linearGradient id={id('moon')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#c7d2fe" />
        </linearGradient>
        <linearGradient id={id('cloud')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={id('cloudDark')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#8494ad" />
        </linearGradient>
        <linearGradient id={id('storm')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#5c6b83" />
        </linearGradient>
        <linearGradient id={id('bolt')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id={id('rain')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <radialGradient id={id('glow')}>
          <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#fcd34d" stopOpacity="0" />
        </radialGradient>
      </defs>

      {render(kind, id, anim)}
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Glyph renderers                                                           */
/* -------------------------------------------------------------------------- */

function render(kind: WeatherIconKind, id: (n: string) => string, anim: string) {
  const Sun = ({ cx = 32, cy = 28, r = 10 }: { cx?: number; cy?: number; r?: number }) => (
    <g>
      <circle cx={cx} cy={cy} r={r * 2.1} fill={`url(#${id('glow')})`} />
      <g
        className={anim}
        style={{ transformOrigin: `${cx}px ${cy}px`, animation: 'spin 26s linear infinite' }}
      >
        {Array.from({ length: 8 }).map((_, index) => {
          const angle = (index * 360) / 8;
          return (
            <rect
              key={index}
              x={cx - 1.4}
              y={cy - r - 8.5}
              width="2.8"
              height="5.6"
              rx="1.4"
              fill="#ffb547"
              transform={`rotate(${angle} ${cx} ${cy})`}
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id('sun')})`} />
      <circle cx={cx - r * 0.28} cy={cy - r * 0.3} r={r * 0.42} fill="#fff3c4" opacity="0.55" />
    </g>
  );

  const Moon = ({ cx = 30, cy = 28, r = 11, stars = true }: { cx?: number; cy?: number; r?: number; stars?: boolean }) => (
    <g>
      <circle cx={cx} cy={cy} r={r * 1.9} fill="#c7d2fe" opacity="0.16" />
      <path
        d={`M ${cx + r * 0.35} ${cy - r} a ${r} ${r} 0 1 0 0 ${r * 2} a ${r * 0.82} ${r * 0.82} 0 1 1 0 ${-r * 2} z`}
        fill={`url(#${id('moon')})`}
      />
      {stars && (
        <g fill="#f8fafc">
          <circle cx={cx + 14} cy={cy - 12} r="1.6" style={{ animation: 'twinkle 3.4s ease-in-out infinite' }} />
          <circle
            cx={cx + 20}
            cy={cy + 2}
            r="1.2"
            style={{ animation: 'twinkle 4.2s ease-in-out infinite 0.6s' }}
          />
          <circle
            cx={cx + 11}
            cy={cy + 13}
            r="1"
            style={{ animation: 'twinkle 5s ease-in-out infinite 1.2s' }}
          />
        </g>
      )}
    </g>
  );

  const Cloud = ({
    x = 0,
    y = 0,
    scale = 1,
    dark = false,
    opacity = 1,
  }: {
    x?: number;
    y?: number;
    scale?: number;
    dark?: boolean;
    opacity?: number;
  }) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <path
        d="M17 44c-6.1 0-11-4.9-11-11 0-5.6 4.2-10.2 9.6-10.9C17.3 15.4 23.4 11 30.5 11c7.9 0 14.4 5.9 15.3 13.5 5 .6 8.9 4.9 8.9 10 0 5.6-4.5 10-10 10H17z"
        fill={`url(#${id(dark ? 'cloudDark' : 'cloud')})`}
      />
      <path
        d="M17 41.6c-4.7 0-8.6-3.8-8.6-8.6 0-4.4 3.3-8 7.5-8.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity={dark ? 0.15 : 0.75}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </g>
  );

  const Drops = ({ count = 3, y = 46, color = `url(#${id('rain')})`, big = false }: { count?: number; y?: number; color?: string; big?: boolean }) => (
    <g>
      {Array.from({ length: count }).map((_, index) => {
        const x = 20 + index * (24 / Math.max(1, count - 1));
        return (
          <path
            key={index}
            d={big ? `M ${x} ${y} l 1.6 6 a 1.6 1.6 0 0 1 -3.2 0 z` : `M ${x} ${y} l 1.3 4.6 a 1.3 1.3 0 0 1 -2.6 0 z`}
            fill={color}
            style={{ animation: `rainFall ${0.9 + index * 0.18}s linear infinite`, animationDelay: `${index * 0.14}s` }}
          />
        );
      })}
    </g>
  );

  switch (kind) {
    case 'clear-day':
      return <Sun cx={32} cy={32} r={12} />;

    case 'clear-night':
      return <Moon cx={30} cy={31} r={13} />;

    case 'partly-day':
      return (
        <g>
          <Sun cx={42} cy={20} r={9.5} />
          <Cloud x={-1} y={16} scale={1.05} />
        </g>
      );

    case 'partly-night':
      return (
        <g>
          <Moon cx={43} cy={20} r={9} />
          <Cloud x={-1} y={16} scale={1.05} />
        </g>
      );

    case 'cloudy':
      return (
        <g>
          <Cloud x={11} y={0} scale={0.78} dark opacity={0.55} />
          <Cloud x={-2} y={15} scale={1.02} />
        </g>
      );

    case 'overcast':
      return (
        <g>
          <Cloud x={8} y={-3} scale={0.82} dark opacity={0.55} />
          <Cloud x={-4} y={7} scale={1.02} dark opacity={0.8} />
          <Cloud x={1} y={18} scale={0.98} dark />
        </g>
      );

    case 'fog':
      return (
        <g>
          <Cloud x={-1} y={0} scale={1.05} dark opacity={0.85} />
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={11 + index * 3}
              y={48 + index * 6}
              width={42 - index * 8}
              height="3.2"
              rx="1.6"
              fill="#94a3b8"
              opacity={0.85 - index * 0.2}
            />
          ))}
        </g>
      );

    case 'haze':
      return (
        <g>
          <Sun cx={32} cy={28} r={11} />
          {[0, 1, 2].map((index) => (
            <rect
              key={index}
              x={6}
              y={45 + index * 6}
              width={52 - index * 7}
              height="3.2"
              rx="1.6"
              fill="#b6c2d2"
              opacity={0.85 - index * 0.18}
            />
          ))}
        </g>
      );

    case 'drizzle':
      return (
        <g>
          <Cloud x={-1} y={1} scale={1.12} dark opacity={0.9} />
          <Drops count={4} y={53} />
        </g>
      );

    case 'rain':
      return (
        <g>
          <Cloud x={-1} y={0} scale={1.14} dark opacity={0.92} />
          <Drops count={4} y={53} big />
        </g>
      );

    case 'heavy-rain':
      return (
        <g>
          <Cloud x={-1} y={-3} scale={1.16} dark />
          <Drops count={5} y={50} big />
          <Drops count={4} y={58} color="#60a5fa" />
        </g>
      );

    case 'thunder':
      return (
        <g>
          <Cloud x={-1} y={-3} scale={1.16} dark />
          <path
            d="M34 40 l-10 16 h7.5 l-3 11 12.5 -17 h-7.5 l5.5 -10 z"
            fill={`url(#${id('bolt')})`}
            style={{ animation: 'pulseSoft 1.6s ease-in-out infinite' }}
          />
        </g>
      );

    case 'snow':
      return (
        <g>
          <Cloud x={-1} y={0} scale={1.1} opacity={0.95} />
          {[0, 1, 2, 3].map((index) => (
            <g
              key={index}
              transform={`translate(${17 + index * 10} ${52 + (index % 2) * 7})`}
              style={{ animation: `spin ${7 + index}s linear infinite`, transformOrigin: 'center' }}
            >
              <path
                d="M0 -4 V4 M-3.4 -2 L3.4 2 M-3.4 2 L3.4 -2"
                stroke="#bfdbfe"
                strokeWidth="1.7"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>
      );

    case 'windy':
      return (
        <g>
          <Cloud x={-6} y={-2} scale={0.9} opacity={0.7} />
          {[0, 1, 2].map((index) => (
            <path
              key={index}
              d={`M10 ${36 + index * 10} h${30 - index * 6} a${5 - index} ${5 - index} 0 1 1 -${5 - index} ${5 - index}`}
              fill="none"
              stroke="#7dd3fc"
              strokeWidth="2.8"
              strokeLinecap="round"
              opacity={1 - index * 0.2}
            />
          ))}
        </g>
      );

    default:
      return <Cloud x={-1} y={6} scale={1.1} />;
  }
}
