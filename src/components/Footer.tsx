import { Globe, Github } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-slate-900 dark:text-white">World Weather Info</span>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            Weather data for cities around the world. Powered by{' '}
            <a
              href="https://open-meteo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:underline"
            >
              Open-Meteo
            </a>
          </p>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Data refreshed every 10 minutes</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} World Weather Info. Weather data provided for informational purposes.
        </div>
      </div>
    </footer>
  );
}
