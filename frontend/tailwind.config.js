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
      },
    },
  },
  plugins: [],
};
