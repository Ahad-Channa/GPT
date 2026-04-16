/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        brand: {
          dark:   '#080b14',
          darker: '#060810',
          card:   'rgba(255,255,255,0.03)',
          border: 'rgba(255,255,255,0.07)',
          accent: '#6366f1',
          violet: '#7c3aed',
          cyan:   '#06b6d4',
        },
      },
      boxShadow: {
        glow:       '0 0 24px rgba(99,102,241,0.15)',
        'glow-lg':  '0 0 48px rgba(99,102,241,0.2)',
        'glow-cyan':'0 0 24px rgba(6,182,212,0.15)',
        'card':     '0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        'gradient-mesh':  'radial-gradient(ellipse at top left, rgba(79,70,229,0.15) 0%, transparent 50%), radial-gradient(ellipse at bottom right, rgba(124,58,237,0.1) 0%, transparent 50%)',
      },
      borderRadius: {
        card: '16px',
      },
      animation: {
        'fade-in':   'fadeIn 0.3s ease-out',
        'slide-up':  'slideUp 0.35s ease-out',
        'pulse-slow':'pulse 3s ease-in-out infinite',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        marquee: { '0%': { transform: 'translateX(0%)' }, '100%': { transform: 'translateX(-50%)' } },
      },
    },
  },
  plugins: [],
}
