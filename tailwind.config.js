/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        navy: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#1e1b4b',
          900: '#0f0d2e',
          950: '#080620',
        },
        aurora: {
          teal: '#2dd4bf',
          sky: '#38bdf8',
          violet: '#a78bfa',
          rose: '#fb7185',
          amber: '#fbbf24',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'slide-down': 'slideDown 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float': 'float 7s ease-in-out infinite',
        'float-slow': 'floatSlow 11s ease-in-out infinite',
        'drift': 'drift 26s linear infinite',
        'drift-slow': 'drift 44s linear infinite',
        'aurora': 'aurora 18s ease-in-out infinite alternate',
        'pulse-soft': 'pulseSoft 3.5s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2.6s ease-out infinite',
        'shimmer': 'shimmer 2.4s linear infinite',
        'spin-slow': 'spin 14s linear infinite',
        'spin-slower': 'spin 32s linear infinite',
        'twinkle': 'twinkle 4s ease-in-out infinite',
        'rain-fall': 'rainFall 0.9s linear infinite',
        'gradient-x': 'gradientX 8s ease infinite',
        'breathe': 'breathe 6s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(26px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-18px) rotate(2.5deg)' },
        },
        drift: {
          '0%': { transform: 'translateX(-12%)' },
          '100%': { transform: 'translateX(112%)' },
        },
        aurora: {
          '0%': { transform: 'translate3d(0,0,0) scale(1)', opacity: '0.55' },
          '50%': { transform: 'translate3d(4%,-6%,0) scale(1.18)', opacity: '0.8' },
          '100%': { transform: 'translate3d(-5%,4%,0) scale(1.05)', opacity: '0.6' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        pulseRing: {
          '0%': { transform: 'scale(0.75)', opacity: '0.7' },
          '100%': { transform: 'scale(2.1)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0.15' },
          '50%': { opacity: '0.9' },
        },
        rainFall: {
          '0%': { transform: 'translateY(-6px)', opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { transform: 'translateY(14px)', opacity: '0' },
        },
        gradientX: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85' },
          '50%': { transform: 'scale(1.06)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
        '3xl': '48px',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.10)',
        'glass-lg': '0 24px 64px -12px rgba(15, 23, 42, 0.22)',
        'glass-dark': '0 8px 40px rgba(0, 0, 0, 0.45)',
        'card-hover': '0 32px 80px -16px rgba(79, 70, 229, 0.35)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.75)',
        'glow': '0 0 40px -8px currentColor',
      },
      transitionTimingFunction: {
        silk: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(to right, rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.14) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};
