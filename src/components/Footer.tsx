import { Globe, Github, Instagram, Coffee, Smartphone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Buy Me a Coffee Section */}
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <Coffee className="w-8 h-8" />
              <h3 className="text-xl md:text-2xl font-bold">Buy me a coffee for more such tools ☕</h3>
            </div>
            <p className="text-white/90 mb-4">Support open source and help me build more awesome tools!</p>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl">
                <Smartphone className="w-5 h-5" />
                <span className="font-medium">Gpay / PhonePe / UPI</span>
              </div>
              <div className="flex flex-wrap gap-3">
                <a
                  href="upi://pay?pa=8017414711@yesbank&pn=RounakAd&cu=INR"
                  className="bg-white text-slate-900 px-4 py-2 rounded-xl font-semibold hover:bg-slate-100 transition-all hover:scale-105 flex items-center gap-2"
                >
                  <span className="text-lg">📱</span> 8017414711
                </a>
                <span className="text-white/80 self-center">or</span>
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl font-mono text-sm">
                  8017414711@yespop
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Footer */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-slate-900 dark:text-white">World Weather Info</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/ig_chromozome"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity"
            >
              <Instagram className="w-4 h-4" />
              <span className="text-sm font-medium">@ig_chromozome</span>
            </a>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Created by <strong className="text-slate-700 dark:text-slate-300">Rounak Adhikary</strong></span>
            <span className="hidden md:inline">•</span>
            <span>Powered by <strong className="text-slate-700 dark:text-slate-300">Soumili Das</strong></span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 dark:text-slate-500">
          © {new Date().getFullYear()} World Weather Info. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
