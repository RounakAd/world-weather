import { CSSProperties, ReactNode, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';
import { cn } from '../utils/helpers';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Peak rotation in degrees applied on pointer move. 0 disables the tilt. */
  tilt?: number;
  /** Adds a soft accent glow behind the card. */
  glow?: string;
  onClick?: () => void;
  style?: CSSProperties;
  /** Renders a <button> instead of a <div> for accessibility. */
  asButton?: boolean;
  ariaLabel?: string;
}

/**
 * The signature surface of the site: a layered glass panel that reacts to the
 * pointer with a real 3D tilt and a travelling specular highlight.
 */
export default function GlassCard({
  children,
  className,
  tilt = 7,
  glow,
  onClick,
  style,
  asButton = false,
  ariaLabel,
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const active = tilt > 0 && !reduceMotion;

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const px = useMotionValue(50);
  const py = useMotionValue(50);

  const springConfig = { stiffness: 180, damping: 22, mass: 0.6 };
  const rotateX = useSpring(useMotionValue(0), springConfig);
  const rotateY = useSpring(useMotionValue(0), springConfig);
  const lift = useSpring(useMotionValue(0), springConfig);

  const sheen = useMotionTemplate`radial-gradient(420px circle at ${px}% ${py}%, rgba(255,255,255,0.28), rgba(255,255,255,0.06) 42%, transparent 68%)`;

  const handleMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!active || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    mx.set(x);
    my.set(y);
    px.set(x * 100);
    py.set(y * 100);
    rotateY.set((x - 0.5) * tilt * 2);
    rotateX.set((0.5 - y) * tilt * 1.4);
    lift.set(-6);
  };

  const handleLeave = () => {
    rotateX.set(0);
    rotateY.set(0);
    lift.set(0);
    px.set(50);
    py.set(50);
    mx.set(0.5);
    my.set(0.5);
  };

  const Inner = motion.div;

  return (
    <div className="perspective-1000" style={{ transformStyle: 'preserve-3d' }}>
      <Inner
        ref={ref as never}
        role={asButton ? 'button' : undefined}
        tabIndex={asButton ? 0 : undefined}
        aria-label={ariaLabel}
        onClick={onClick}
        onKeyDown={
          asButton && onClick
            ? (event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onClick();
                }
              }
            : undefined
        }
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
        initial={false}
        style={{
          rotateX: active ? rotateX : 0,
          rotateY: active ? rotateY : 0,
          y: active ? lift : 0,
          transformStyle: 'preserve-3d',
          ...style,
        }}
        className={cn(
          'glass relative overflow-hidden text-left',
          onClick || asButton ? 'cursor-pointer' : '',
          className,
        )}
      >
        {/* travelling specular highlight */}
        {active && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1]"
            style={{ background: sheen }}
          />
        )}

        {glow && (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-10 z-0 opacity-70 blur-3xl"
            style={{ background: glow }}
          />
        )}

        <div className="relative z-[2]" style={{ transform: 'translateZ(28px)' }}>
          {children}
        </div>
      </Inner>
    </div>
  );
}
