/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep navy — brand identity (sidebar, headers, primary actions).
        primary: {
          50: '#F4F3FA',
          100: '#E9E9EE',
          200: '#C8C8D4',
          300: '#9C9BB2',
          400: '#706F8F',
          500: '#44426D',
          600: '#353161',
          700: '#232153',
          800: '#1C1A42',
          900: '#151432',
          950: '#0E0D21',
        },
        // Gold — accents, active states, highlights.
        secondary: {
          50: '#FFFCF4',
          100: '#FEF7DD',
          200: '#FCEDAF',
          300: '#FAE281',
          400: '#F8D548',
          500: '#F6CB1A',
          600: '#DDB717',
          700: '#B99814',
          800: '#947A10',
          900: '#6F5B0C',
          950: '#4A3D08',
        },
        // Marketing homepage palette only — distinct from primary/secondary
        // above (which style the vendor dashboard), scoped to pages/index.tsx.
        'brand-white': '#ffffff',
        'brand-bg': '#f5f4ff',
        'brand-surface': '#ffffff',
        'brand-border': '#e4e2f8',
        'brand-text': '#1a1833',
        'brand-muted': '#6b6891',
        'brand-accent': '#4f46e5',
        'brand-accent-light': '#ede9ff',
        'brand-magenta': '#db2777',
        'brand-magenta-light': '#fce7f3',
        'brand-green': '#059669',
        'brand-green-light': '#d1fae5',
        'brand-yellow': '#d97706',
        'brand-yellow-light': '#fef3c7',
      },
      letterSpacing: {
        // Default Tailwind value is -0.05em — only pages/index.tsx uses
        // tracking-tighter (checked), so this only affects the marketing
        // homepage's headings, not the dashboard/admin/auth pages.
        tighter: '-0.02em',
      },
      // Every named size bumped +2px site-wide (dashboard, admin, auth
      // pages, public catalog pages, marketing homepage — this scale is
      // global, not per-page). Line-heights bumped the same +2px to keep
      // each size's original leading proportional; the 5xl-9xl display
      // sizes keep Tailwind's own unitless line-height:1 since there's no
      // length value there to add to. Every <h1> on every page is
      // explicitly exempted back to Tailwind's stock values in
      // globals.css, since a class-based scale override can't tell "this
      // text-3xl is an h1" from "this text-3xl is a card title" — only
      // the CSS there can target the element itself.
      fontSize: {
        xs: ['calc(0.75rem + 2px)', { lineHeight: 'calc(1rem + 2px)' }],
        sm: ['calc(0.875rem + 2px)', { lineHeight: 'calc(1.25rem + 2px)' }],
        base: ['calc(1rem + 2px)', { lineHeight: 'calc(1.5rem + 2px)' }],
        lg: ['calc(1.125rem + 2px)', { lineHeight: 'calc(1.75rem + 2px)' }],
        xl: ['calc(1.25rem + 2px)', { lineHeight: 'calc(1.75rem + 2px)' }],
        '2xl': ['calc(1.5rem + 2px)', { lineHeight: 'calc(2rem + 2px)' }],
        '3xl': ['calc(1.875rem + 2px)', { lineHeight: 'calc(2.25rem + 2px)' }],
        '4xl': ['calc(2.25rem + 2px)', { lineHeight: 'calc(2.5rem + 2px)' }],
        '5xl': ['calc(3rem + 2px)', { lineHeight: '1' }],
        '6xl': ['calc(3.75rem + 2px)', { lineHeight: '1' }],
        '7xl': ['calc(4.5rem + 2px)', { lineHeight: '1' }],
        '8xl': ['calc(6rem + 2px)', { lineHeight: '1' }],
        '9xl': ['calc(8rem + 2px)', { lineHeight: '1' }],
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
