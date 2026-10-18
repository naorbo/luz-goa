/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Heebo', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        display: ['Frank Ruhl Libre', 'Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        canopy: {
          950: '#0F1A14',
          900: '#15241C',
          800: '#1C2E24',
          700: '#263E31',
          600: '#325240',
          500: '#426B54',
          100: '#E3ECE6',
          50: '#F2F6F4',
        },
        sand: {
          50: '#FAF8F5',
          100: '#F4F1EB',
          200: '#EAE4D8',
          300: '#DDD4C3',
          400: '#C5B8A1',
        },
        terracotta: {
          600: '#BF563E',
          500: '#D46B54',
          400: '#E0826D',
          100: '#F9E6E1',
          50: '#FDF5F3',
        },
        ochre: {
          600: '#B58E24',
          500: '#D4AF37',
          400: '#E2C35B',
          100: '#F9F2D9',
          50: '#FDFBF0',
        },
        lagoon: {
          700: '#1E525B',
          600: '#2A6F7B',
          500: '#378896',
          100: '#E0F0F3',
          50: '#F1F8FA',
        }
      },
      boxShadow: {
        'surface': '0 4px 20px -2px rgba(28, 46, 36, 0.06), 0 1px 3px 0 rgba(28, 46, 36, 0.04)',
        'elevated': '0 12px 32px -4px rgba(28, 46, 36, 0.12), 0 2px 6px 0 rgba(28, 46, 36, 0.06)',
      }
    },
  },
  plugins: [],
}
