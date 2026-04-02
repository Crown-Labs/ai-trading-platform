/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#3a3f47',
          700: '#2b2f36',
          800: '#1e2026',
          900: '#0b0e11',
        },
        terminal: {
          bg: '#0b0e11',
          surface: '#1e2026',
          surface2: '#2b2f36',
          border: '#2b2f36',
          accent: '#f0b90b',
          green: '#03a66d',
          red: '#cf304a',
          text: '#eaecef',
          muted: '#848e9c',
        },
      },
    },
  },
  plugins: [],
}
