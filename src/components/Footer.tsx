import { useEffect, useState } from 'react';
import { Check, CloudUpload, Coffee, Github, Globe, Instagram, Smartphone } from 'lucide-react';
import GlassCard from './GlassCard';
import { githubSync, type SyncStatus } from '../services/githubSync';

const SECTIONS = [
  { id: 'current-weather', label: 'Current weather' },
  { id: 'world-clocks', label: 'World clocks' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'insights', label: 'Trends & air' },
  { id: 'city-grid', label: 'All cities' },
];

/**
 * A single quiet line about the repository snapshot.
 *
 * The sync has no controls on purpose — the token comes from the build — but a
 * silent background feature is impossible to trust, so its outcome is visible.
 * Nothing renders on a build without a token.
 */
function SnapshotStatus() {
  const [status, setStatus] = useState<SyncStatus>(() => githubSync.getStatus());
  const [enabled] = useState(() => githubSync.hasToken());

  useEffect(() => githubSync.subscribe(setStatus), []);

  if (!enabled || status.state === 'off') return null;

  const failed = status.state === 'error';
  const done = status.state === 'synced';
  const label = failed
    ? 'Snapshot not committed'
    : done
      ? `Snapshot committed${status.sha ? ` · ${status.sha}` : ''}`
      : status.state === 'unchanged'
        ? 'Snapshot already current'
        : 'Committing snapshot…';

  return (
    <span className={`flex items-center gap-1.5 ${failed ? 'text-rose-500' : 'text-faint'}`} title={status.message}>
      {done ? <Check className="h-3 w-3" /> : <CloudUpload className="h-3 w-3" />}
      {label}
    </span>
  );
}

export default function Footer() {
  return (
    <footer className="relative px-4 pb-10 pt-6">
      <div className="mx-auto max-w-7xl">
        {/* ---------------------------- support card --------------------------- */}
        <GlassCard tilt={3} className="mb-8 overflow-hidden p-6 sm:p-7">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-90"
            style={{
              background:
                'linear-gradient(120deg, rgba(99,102,241,0.28), rgba(168,85,247,0.22) 45%, rgba(236,72,153,0.2))',
            }}
          />

          <div className="relative">
            <div className="mb-2 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/25 backdrop-blur-md">
                <Coffee className="h-5 w-5 text-white" />
              </span>
              <h3 className="font-display text-xl font-bold text-white sm:text-2xl">
                Buy me a coffee for more such tools ☕
              </h3>
            </div>
            <p className="mb-5 text-sm text-white/85">
              This project is free, open source and ad-free. Support it and help build more weather tools.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 rounded-2xl border border-white/25 bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-md">
                <Smartphone className="h-4 w-4" />
                GPay / PhonePe / UPI
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <a
                  href="upi://pay?pa=8017414711@yesbank&pn=RounakAd&cu=INR"
                  className="flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-900 transition-transform duration-300 hover:scale-105"
                >
                  <span>📱</span> 8017414711
                </a>
                <span className="text-xs text-white/70">or</span>
                <span className="rounded-2xl border border-white/25 bg-white/20 px-4 py-2 font-mono text-xs text-white backdrop-blur-md">
                  8017414711@yespop
                </span>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* ------------------------------ main row ---------------------------- */}
        <div className="grid gap-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500">
                <Globe className="text-white" style={{ width: 18, height: 18 }} />
              </span>
              <span className="font-display text-sm font-bold text-slate-900 dark:text-white">
                World Weather Info
              </span>
            </div>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-soft">
              Real-time conditions, air quality, precipitation and 7-day outlooks for major cities worldwide —
              every time shown in the city's own local timezone.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
              <span className="chip">React 18</span>
              <span className="chip">TypeScript</span>
              <span className="chip">Tailwind</span>
              <span className="chip">Framer Motion</span>
              <span className="chip">Recharts</span>
            </div>
          </div>

          <div>
            <h4 className="section-label mb-3">Explore</h4>
            <ul className="space-y-2">
              {SECTIONS.map((section) => (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                    }
                    className="text-xs font-medium text-soft transition-colors hover:text-indigo-500"
                  >
                    {section.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="section-label mb-3">Connect</h4>
            <div className="flex flex-col gap-2">
              <a
                href="https://instagram.com/ig_chromozome"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/40 bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-2 text-xs font-semibold text-white transition-transform duration-300 hover:scale-[1.03] dark:border-slate-700/40"
              >
                <Instagram className="h-3.5 w-3.5" />
                @ig_chromozome
              </a>
              <a
                href="https://open-meteo.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-white/40 bg-white/45 px-3 py-2 text-xs font-medium text-soft backdrop-blur-md transition-colors hover:text-indigo-500 dark:border-slate-700/40 dark:bg-slate-800/45"
              >
                <Github className="h-3.5 w-3.5" />
                Weather data: Open-Meteo
              </a>
            </div>
          </div>
        </div>

        <div className="divider my-6" />

        <div className="flex flex-col items-center justify-between gap-3 text-xs text-soft md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>
              Created by <strong className="font-semibold text-slate-700 dark:text-slate-200">Rounak Adhikary</strong>
            </span>
            <span className="text-faint">•</span>
            <span>
              Powered by <strong className="font-semibold text-slate-700 dark:text-slate-200">Soumili Das</strong>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SnapshotStatus />
            <span className="text-faint">
              © {new Date().getFullYear()} World Weather Info. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
