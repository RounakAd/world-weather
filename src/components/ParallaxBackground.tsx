import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import { skyPalette } from '../utils/helpers';
import { WeatherCondition } from '../types/weather';

interface ParallaxBackgroundProps {
  condition: WeatherCondition;
  isDay: boolean;
  theme: 'light' | 'dark';
}

interface Star {
  left: number;
  top: number;
  size: number;
  delay: number;
  duration: number;
}

/**
 * The immersive backdrop. Five depth layers move at different rates against
 * scroll and pointer movement, so the page reads as a real 3D space rather
 * than a flat scroll of cards.
 */
export default function ParallaxBackground({ condition, isDay, theme }: ParallaxBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();

  /* --- pointer parallax (raw, smoothed with springs) ---------------------- */
  const pointerX = useSpring(0, { stiffness: 60, damping: 20, mass: 0.7 });
  const pointerY = useSpring(0, { stiffness: 60, damping: 20, mass: 0.7 });

  useEffect(() => {
    if (reduceMotion) return;
    const handle = (event: PointerEvent) => {
      const nx = event.clientX / window.innerWidth - 0.5;
      const ny = event.clientY / window.innerHeight - 0.5;
      pointerX.set(nx);
      pointerY.set(ny);
    };
    window.addEventListener('pointermove', handle, { passive: true });
    return () => window.removeEventListener('pointermove', handle);
  }, [pointerX, pointerY, reduceMotion]);

  /* --- scroll parallax per layer ------------------------------------------ */
  const farY = useTransform(scrollY, [0, 2400], [0, reduceMotion ? 0 : -110]);
  const midY = useTransform(scrollY, [0, 2400], [0, reduceMotion ? 0 : -240]);
  const nearY = useTransform(scrollY, [0, 2400], [0, reduceMotion ? 0 : -420]);
  const skyShift = useTransform(scrollY, [0, 1600], [0, reduceMotion ? 0 : 140]);

  /* --- pointer-driven layer offsets --------------------------------------- */
  const farX = useTransform(pointerX, [-0.5, 0.5], [14, -14]);
  const midX = useTransform(pointerX, [-0.5, 0.5], [30, -30]);
  const nearX = useTransform(pointerX, [-0.5, 0.5], [54, -54]);
  const farPY = useTransform(pointerY, [-0.5, 0.5], [10, -10]);
  const midPY = useTransform(pointerY, [-0.5, 0.5], [22, -22]);

  const palette = useMemo(() => skyPalette(condition, isDay, theme), [condition, isDay, theme]);

  /** Stars only make sense on a dark canvas. */
  const showStars = theme === 'dark' || !isDay;

  /** A warm sun only reads correctly under a clear sky. */
  const warm = isDay && (condition === 'Sunny' || condition === 'Clear');

  const stars = useMemo<Star[]>(
    () =>
      Array.from({ length: 80 }, (_, index) => ({
        left: (index * 37.7) % 100,
        top: (index * 53.3) % 62,
        size: 1 + ((index * 7) % 3) * 0.7,
        delay: (index % 10) * 0.4,
        duration: 3 + (index % 5),
      })),
    [],
  );

  const clouds = useMemo(
    () => [
      { top: '12%', scale: 1.1, duration: 96, delay: 0, opacity: 0.5 },
      { top: '26%', scale: 0.75, duration: 132, delay: -30, opacity: 0.38 },
      { top: '44%', scale: 1.35, duration: 168, delay: -70, opacity: 0.3 },
      { top: '62%', scale: 0.9, duration: 120, delay: -95, opacity: 0.24 },
    ],
    [],
  );

  return (
    <div
      ref={containerRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      style={
        {
          '--sky-1': palette.sky1,
          '--sky-2': palette.sky2,
          '--sky-3': palette.sky3,
          '--sky-glow': palette.glow,
          '--accent': palette.accent,
          background: `linear-gradient(170deg, ${palette.sky1} 0%, ${palette.sky2} 42%, ${palette.sky3} 100%)`,
          transition: 'background 1.2s ease',
        } as React.CSSProperties
      }
    >
      {/* ---- Layer 0: sky gradient shift ---------------------------------- */}
      <motion.div
        className="absolute inset-0"
        style={{
          y: skyShift,
          background: `radial-gradient(120% 80% at 78% -10%, ${palette.glow}, transparent 62%)`,
        }}
      />

      {/* ---- Layer 1: celestial body -------------------------------------- */}
      <motion.div
        className="absolute right-[8%] top-[6%] h-56 w-56 rounded-full blur-[2px] md:h-72 md:w-72"
        style={{
          x: farX,
          y: farY,
          background:
            theme === 'dark'
              ? warm
                ? 'radial-gradient(circle at 35% 35%, #fef3c7, #fbbf24 42%, rgba(217,119,6,0.28) 68%, transparent 78%)'
                : 'radial-gradient(circle at 38% 34%, #ffffff, #e0e7ff 45%, rgba(199,210,254,0.22) 72%, transparent 80%)'
              : warm
                ? 'radial-gradient(circle at 35% 35%, #fff7d6, #fcd34d 45%, rgba(251,146,60,0.35) 70%, transparent 78%)'
                : 'radial-gradient(circle at 38% 34%, #f8fafc, #c7d2fe 45%, rgba(129,140,248,0.3) 72%, transparent 80%)',
          boxShadow:
            theme === 'dark'
              ? warm
                ? '0 0 150px 30px rgba(251,191,36,0.22)'
                : '0 0 130px 26px rgba(165,180,252,0.22)'
              : warm
                ? '0 0 160px 40px rgba(251,191,36,0.35)'
                : '0 0 150px 36px rgba(129,140,248,0.4)',
          opacity: theme === 'dark' ? 0.7 : 0.85,
        }}
      />

      {/* ---- Layer 2: star field (dark canvas only) ------------------------ */}
      {showStars && (
        <motion.div className="absolute inset-0" style={{ x: farX, y: farY, opacity: theme === 'dark' ? 0.75 : 1 }}>
          {stars.map((star, index) => (
            <span
              key={index}
              className="absolute rounded-full bg-white"
              style={{
                left: `${star.left}%`,
                top: `${star.top}%`,
                width: star.size,
                height: star.size,
                animation: reduceMotion ? undefined : `twinkle ${star.duration}s ease-in-out infinite`,
                animationDelay: `${star.delay}s`,
                opacity: 0.75,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* ---- Layer 3: aurora blobs ---------------------------------------- */}
      <motion.div className="absolute inset-0" style={{ x: midX, y: midY, opacity: theme === 'dark' ? 0.75 : 0.85 }}>
        <div
          className="absolute -left-[12%] top-[-8%] h-[46vh] w-[46vh] rounded-full blur-[110px]"
          style={{
            background: theme === 'dark' ? 'rgba(79,70,229,0.5)' : 'rgba(129,140,248,0.5)',
            animation: reduceMotion ? undefined : 'aurora 19s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute left-[42%] top-[16%] h-[38vh] w-[38vh] rounded-full blur-[120px]"
          style={{
            background: theme === 'dark' ? 'rgba(14,165,233,0.42)' : 'rgba(45,212,191,0.38)',
            animation: reduceMotion ? undefined : 'aurora 24s ease-in-out infinite alternate-reverse',
          }}
        />
        <div
          className="absolute right-[-6%] top-[38%] h-[42vh] w-[42vh] rounded-full blur-[130px]"
          style={{
            background: theme === 'dark' ? 'rgba(168,85,247,0.42)' : 'rgba(251,191,36,0.34)',
            animation: reduceMotion ? undefined : 'aurora 28s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute bottom-[-14%] left-[18%] h-[44vh] w-[44vh] rounded-full blur-[140px]"
          style={{
            background: theme === 'dark' ? 'rgba(236,72,153,0.34)' : 'rgba(236,72,153,0.26)',
            animation: reduceMotion ? undefined : 'aurora 22s ease-in-out infinite alternate-reverse',
          }}
        />
      </motion.div>

      {/* ---- Layer 4: drifting clouds -------------------------------------- */}
      <motion.div className="absolute inset-0" style={{ x: nearX, y: nearY }}>
        {clouds.map((cloud, index) => (
          <div
            key={index}
            className="absolute left-0"
            style={{
              top: cloud.top,
              opacity: theme === 'dark' ? cloud.opacity * 0.35 : cloud.opacity,
              animation: reduceMotion ? undefined : `drift ${cloud.duration}s linear infinite`,
              animationDelay: `${cloud.delay}s`,
              transform: `scale(${cloud.scale})`,
            }}
          >
            <svg width="320" height="110" viewBox="0 0 320 110" fill="none">
              <path
                d="M40 92c-17 0-31-13-31-29 0-15 12-27 27-28C42 16 58 4 78 4c22 0 40 16 43 37 15 2 26 14 26 28 0 13-11 23-24 23H40z"
                fill={theme === 'dark' ? 'rgba(148,163,184,0.22)' : 'rgba(255,255,255,0.72)'}
              />
              <path
                d="M170 96c-14 0-25-11-25-24 0-12 9-22 21-23C169 34 182 24 199 24c19 0 34 13 37 31 12 2 21 12 21 23 0 10-8 18-19 18h-68z"
                fill={theme === 'dark' ? 'rgba(148,163,184,0.16)' : 'rgba(255,255,255,0.55)'}
              />
            </svg>
          </div>
        ))}
      </motion.div>

      {/* ---- Layer 5: texture + vignette ----------------------------------- */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.07) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(120% 90% at 50% 0%, #000 20%, transparent 78%)',
          WebkitMaskImage: 'radial-gradient(120% 90% at 50% 0%, #000 20%, transparent 78%)',
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(180deg, transparent 30%, rgba(3,6,20,0.72) 100%)'
              : 'linear-gradient(180deg, transparent 40%, rgba(255,255,255,0.42) 100%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          mixBlendMode: 'overlay',
        }}
      />
    </div>
  );
}
