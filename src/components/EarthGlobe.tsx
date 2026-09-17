import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

interface EarthGlobeProps {
  className?: string;
  /** Latitude/longitude to pin with a marker (the selected city). */
  marker?: { lat: number; lng: number; label?: string } | null;
  /** Upper bound on the render resolution, in device-independent pixels. */
  maxSize?: number;
}

const TAU = Math.PI * 2;
const DEG = Math.PI / 180;

/** One full revolution every ~100 s — visible, but never distracting. */
const ROTATION_DEG_PER_SEC = 3.6;
/** Clouds drift a little faster than the surface, as they really do. */
const CLOUD_DRIFT = 1.07;

/** 20 fps is plenty for a slow rotation, and keeps the main thread free. */
const FRAME_MS = 1000 / 20;

/** Sun direction in view space: upper-left, slightly toward the camera. */
const SUN = (() => {
  const v = { x: -0.52, y: -0.34, z: 0.78 };
  const len = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
})();

interface Lut {
  /** Flat pixel offsets into the ImageData buffer. */
  offsets: Uint32Array;
  /** Pre-divided texture U for this pixel: (lonOffset + 180) / 360. */
  uBase: Float32Array;
  /** Byte offset of the upper/lower day-texture row, plus the vertical blend. */
  dayY0: Int32Array;
  dayY1: Int32Array;
  dayTy: Float32Array;
  /** Byte offset of the cloud and night rows (nearest sampling). */
  cloudRow: Int32Array;
  nightRow: Int32Array;
  /** Surface normal, used for lighting. */
  nx: Float32Array;
  ny: Float32Array;
  nz: Float32Array;
  /** Pre-baked atmospheric rim falloff. */
  rim: Float32Array;
  count: number;
}

/**
 * Builds the orthographic inverse projection once. Because the globe only ever
 * rotates about its polar axis, every per-pixel value except longitude is
 * constant for the lifetime of the component — so the animation loop is just a
 * texture lookup, not a projection.
 *
 * Everything that can be precomputed is: row indices, byte offsets, vertical
 * blend factors and the U base. That removes all divisions, `Math.floor` calls
 * and row arithmetic from the hot loop.
 */
function buildLut(
  size: number,
  dayW: number,
  dayH: number,
  cloudW: number,
  cloudH: number,
  nightW: number,
  nightH: number,
): Lut {
  const R = size / 2;
  const offsets: number[] = [];
  const uBase: number[] = [];
  const dayY0: number[] = [];
  const dayY1: number[] = [];
  const dayTy: number[] = [];
  const cloudRow: number[] = [];
  const nightRow: number[] = [];
  const nx: number[] = [];
  const ny: number[] = [];
  const nz: number[] = [];
  const rim: number[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x + 0.5 - R) / R;
      const dy = (y + 0.5 - R) / R;
      const rho2 = dx * dx + dy * dy;
      if (rho2 > 1) continue;

      const rho = Math.sqrt(rho2);
      const cosC = Math.sqrt(Math.max(0, 1 - rho2)); // cos of angular distance
      const sinC = rho;

      let latDeg: number;
      let lonDeg: number;
      if (rho < 1e-6) {
        latDeg = 0;
        lonDeg = 0;
      } else {
        latDeg = Math.asin(Math.max(-1, Math.min(1, (dy * sinC) / rho))) / DEG;
        lonDeg = Math.atan2(dx * sinC, rho * cosC) / DEG;
      }

      // --- vertical texture coordinate, and the bilinear pair around it
      const v = (90 - latDeg) / 180;
      const fy = v * dayH - 0.5;
      const y0f = fy < 0 ? 0 : fy | 0;
      const y1f = y0f + 1 > dayH - 1 ? dayH - 1 : y0f + 1;
      dayTy.push(fy < 0 ? 0 : fy - y0f);
      dayY0.push((y0f * dayW) << 2);
      dayY1.push((y1f * dayW) << 2);

      const cloudY = Math.min(cloudH - 1, Math.round(v * (cloudH - 1)));
      cloudRow.push((cloudY * cloudW) << 2);
      const nightY = Math.min(nightH - 1, Math.round(v * (nightH - 1)));
      nightRow.push((nightY * nightW) << 2);

      uBase.push((lonDeg + 180) / 360);
      nx.push(dx);
      ny.push(dy);
      nz.push(cosC);
      // Atmosphere is densest right at the limb.
      rim.push(Math.pow(rho, 3.4));
      offsets.push((y * size + x) * 4);
    }
  }

  return {
    offsets: Uint32Array.from(offsets),
    uBase: Float32Array.from(uBase),
    dayY0: Int32Array.from(dayY0),
    dayY1: Int32Array.from(dayY1),
    dayTy: Float32Array.from(dayTy),
    cloudRow: Int32Array.from(cloudRow),
    nightRow: Int32Array.from(nightRow),
    nx: Float32Array.from(nx),
    ny: Float32Array.from(ny),
    nz: Float32Array.from(nz),
    rim: Float32Array.from(rim),
    count: offsets.length,
  };
}

function toImageData(img: HTMLImageElement): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d context unavailable');
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

/**
 * A physically-lit, rotating Earth rendered from real NASA Blue Marble imagery.
 *
 * Day texture + drifting cloud layer + night-side city lights, lit by a fixed
 * sun so the terminator sweeps across the surface as the planet turns. The
 * whole sphere is drawn per-pixel on a canvas; no WebGL and no 3D library.
 */
export default function EarthGlobe({ className = '', marker, maxSize = 480 }: EarthGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [renderSize, setRenderSize] = useState(0);

  /* Marker kept in a ref so the animation loop never has to restart for it. */
  const markerRef = useRef(marker);
  useEffect(() => {
    markerRef.current = marker;
  }, [marker]);

  /* Track the host size so the canvas resolution follows the layout. */
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const measure = () => {
      const rect = host.getBoundingClientRect();
      const next = Math.round(Math.min(maxSize, Math.max(220, Math.min(rect.width, rect.height) || maxSize)));
      setRenderSize((prev) => (prev === next ? prev : next));
    };

    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [maxSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || renderSize === 0) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      setFailed(true);
      return;
    }

    let disposed = false;
    let raf = 0;
    let visible = true;
    let lastFrame = 0;

    const base = import.meta.env.BASE_URL || '/';

    (async () => {
      try {
        const [dayImg, cloudImg, nightImg] = await Promise.all([
          loadImage(`${base}textures/earth-day.webp`),
          loadImage(`${base}textures/earth-clouds.webp`),
          loadImage(`${base}textures/earth-night.webp`),
        ]);
        if (disposed) return;

        const day = toImageData(dayImg);
        const clouds = toImageData(cloudImg);
        const night = toImageData(nightImg);

        const render = renderSize;
        canvas.width = render;
        canvas.height = render;

        const lut = buildLut(render, day.width, day.height, clouds.width, clouds.height, night.width, night.height);
        const out = ctx.createImageData(render, render);
        const buf = out.data;

        const dayW = day.width;
        const dayD = day.data;
        const cloudW = clouds.width;
        const cloudD = clouds.data;
        const nightW = night.width;
        const nightD = night.data;

        const { offsets, uBase, dayY0, dayY1, dayTy, cloudRow, nightRow, nx, ny, nz, rim, count } = lut;

        const draw = (time: number) => {
          const t = reduceMotion ? 42 : time / 1000;
          const lon0 = t * ROTATION_DEG_PER_SEC;
          const uShift = (t * ROTATION_DEG_PER_SEC) / 360;
          const cloudShift = (t * ROTATION_DEG_PER_SEC * CLOUD_DRIFT) / 360;

          for (let i = 0; i < count; i++) {
            /* ---- day texture: bilinear, with the row pair precomputed ---- */
            let u = uBase[i] + uShift;
            u -= u | 0;
            let fx = u * dayW - 0.5;
            if (fx < 0) fx += dayW;
            const x0 = fx | 0;
            const tx = fx - x0;
            const x1 = x0 + 1 >= dayW ? 0 : x0 + 1;

            const b00 = dayY0[i] + (x0 << 2);
            const b10 = dayY0[i] + (x1 << 2);
            const b01 = dayY1[i] + (x0 << 2);
            const b11 = dayY1[i] + (x1 << 2);

            const ty = dayTy[i];
            const w00 = (1 - tx) * (1 - ty);
            const w10 = tx * (1 - ty);
            const w01 = (1 - tx) * ty;
            const w11 = tx * ty;

            const dr = dayD[b00] * w00 + dayD[b10] * w10 + dayD[b01] * w01 + dayD[b11] * w11;
            const dg = dayD[b00 + 1] * w00 + dayD[b10 + 1] * w10 + dayD[b01 + 1] * w01 + dayD[b11 + 1] * w11;
            const db = dayD[b00 + 2] * w00 + dayD[b10 + 2] * w10 + dayD[b01 + 2] * w01 + dayD[b11 + 2] * w11;

            /* ---- diffuse lighting from a fixed sun ---- */
            let diffuse = nx[i] * SUN.x + ny[i] * SUN.y + nz[i] * SUN.z;
            if (diffuse < 0) diffuse = 0;

            const shade = 0.085 + 1.02 * diffuse;
            let cr = dr * shade;
            let cg = dg * shade;
            let cb = db * shade;

            /* ---- night side: city lights, only where it is genuinely dark ---- */
            if (diffuse < 0.32) {
              const nightMix = 1 - diffuse / 0.32;
              const nm = nightMix * nightMix;
              let nu = uBase[i] + uShift;
              nu -= nu | 0;
              const ni = nightRow[i] + ((nu * nightW) | 0) * 4;
              const lum = (nightD[ni] + nightD[ni + 1] + nightD[ni + 2]) * (1 / 255);
              const boost = nm * (0.55 + 1.5 * lum);
              cr += nightD[ni] * boost * 1.15;
              cg += nightD[ni + 1] * boost * 1.1;
              cb += nightD[ni + 2] * boost * 0.85;
            }

            /* ---- cloud layer: nearest sample, mostly transparent ---- */
            let cu = uBase[i] + cloudShift;
            cu -= cu | 0;
            const ci = cloudRow[i] + ((cu * cloudW) | 0) * 4;
            const alpha = cloudD[ci + 3] * (1 / 255);
            if (alpha > 0.02) {
              const cloudShade = 0.2 + 0.95 * diffuse;
              const inv = 1 - alpha;
              cr = cr * inv + cloudD[ci] * alpha * cloudShade;
              cg = cg * inv + cloudD[ci + 1] * alpha * cloudShade;
              cb = cb * inv + cloudD[ci + 2] * alpha * cloudShade;
            }

            /* ---- atmospheric limb ---- */
            const rimGlow = rim[i];
            if (rimGlow > 0.01) {
              const light = 0.35 + 0.65 * diffuse;
              cr += rimGlow * 46 * light;
              cg += rimGlow * 92 * light;
              cb += rimGlow * 168 * light;
            }

            const o = offsets[i];
            buf[o] = cr > 255 ? 255 : cr;
            buf[o + 1] = cg > 255 ? 255 : cg;
            buf[o + 2] = cb > 255 ? 255 : cb;
            buf[o + 3] = 255;
          }

          ctx.putImageData(out, 0, 0);

          // --- selected-city marker, drawn on top of the sphere
          const m = markerRef.current;
          if (m) {
            const latR = m.lat * DEG;
            const lonR = (m.lng + lon0) * DEG;
            const mx = Math.cos(latR) * Math.sin(lonR);
            const my = Math.sin(latR);
            const mz = Math.cos(latR) * Math.cos(lonR);

            if (mz > 0.02) {
              const px = render / 2 + mx * (render / 2);
              const py = render / 2 - my * (render / 2);
              const depth = 0.35 + 0.65 * mz;

              ctx.save();
              ctx.globalCompositeOperation = 'lighter';
              const glow = ctx.createRadialGradient(px, py, 0, px, py, render * 0.055);
              glow.addColorStop(0, `rgba(125, 211, 252, ${0.75 * depth})`);
              glow.addColorStop(0.45, `rgba(56, 189, 248, ${0.35 * depth})`);
              glow.addColorStop(1, 'rgba(56, 189, 248, 0)');
              ctx.fillStyle = glow;
              ctx.beginPath();
              ctx.arc(px, py, render * 0.055, 0, TAU);
              ctx.fill();

              ctx.globalCompositeOperation = 'source-over';
              ctx.beginPath();
              ctx.arc(px, py, render * 0.011, 0, TAU);
              ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * depth})`;
              ctx.fill();

              ctx.beginPath();
              ctx.arc(px, py, render * 0.021, 0, TAU);
              ctx.strokeStyle = `rgba(125, 211, 252, ${0.85 * depth})`;
              ctx.lineWidth = Math.max(1, render * 0.0035);
              ctx.stroke();
              ctx.restore();
            }
          }
        };

        const loop = (time: number) => {
          raf = requestAnimationFrame(loop);
          if (!visible) return;
          if (time - lastFrame < FRAME_MS) return;
          lastFrame = time;
          draw(time);
        };

        if (disposed) return;
        setReady(true);
        raf = requestAnimationFrame(loop);
      } catch (error) {
        console.error('Earth textures failed to load:', error);
        if (!disposed) setFailed(true);
      }
    })();

    /* Pause rendering while the globe is scrolled out of view. */
    const host = hostRef.current;
    let observer: IntersectionObserver | undefined;
    if (host && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? true;
        },
        { rootMargin: '120px' },
      );
      observer.observe(host);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
    };
  }, [renderSize, reduceMotion]);

  return (
    <div ref={hostRef} className={`relative h-full w-full ${className}`}>
      {/* atmosphere halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-[14%] rounded-full blur-2xl"
        style={{
          background:
            'radial-gradient(circle at 42% 38%, rgba(125,211,252,0.34), rgba(59,130,246,0.2) 46%, rgba(30,64,175,0.06) 66%, transparent 76%)',
          opacity: failed ? 0 : 1,
        }}
      />

      {/* fallback sphere if the textures cannot be fetched */}
      {failed && (
        <div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            background:
              'radial-gradient(circle at 34% 30%, rgba(129,140,248,0.95), rgba(56,189,248,0.75) 38%, rgba(15,23,42,0.95) 78%)',
            boxShadow: 'inset -18px -22px 60px rgba(2,6,23,0.85), 0 30px 80px -20px rgba(79,70,229,0.6)',
          }}
        />
      )}

      <canvas
        ref={canvasRef}
        className="relative block h-full w-full rounded-full"
        style={{
          opacity: ready ? 1 : 0,
          transition: 'opacity 900ms cubic-bezier(0.22, 1, 0.36, 1)',
          boxShadow: '0 40px 90px -30px rgba(8, 20, 60, 0.75)',
        }}
        aria-label="Live rotating globe showing Earth"
        role="img"
      />

      {!ready && !failed && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-white/80" />
        </div>
      )}
    </div>
  );
}
