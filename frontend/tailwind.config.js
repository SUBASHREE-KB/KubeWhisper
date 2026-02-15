/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          darkest: '#0A0A0A',
          dark: '#171717',
          medium: '#262626',
          hover: '#404040',
        },
        border: {
          dark: '#262626',
          light: '#404040',
        },
        text: {
          primary: '#FAFAFA',
          secondary: '#A3A3A3',
          muted: '#737373',
        },
        status: {
          success: '#22C55E',
          warning: '#EAB308',
          error: '#EF4444',
          info: '#3B82F6',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-success': '0 0 10px #22C55E',
        'glow-warning': '0 0 10px #EAB308',
        'glow-error': '0 0 10px #EF4444',
        'glow-info': '0 0 10px #3B82F6',
        'glow-white': '0 0 20px rgba(255,255,255,0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
