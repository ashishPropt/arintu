/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#edfff6',
          100: '#d3f5e7',
          200: '#a9ebd1',
          300: '#6dd9b3',
          400: '#3dc898',
          500: '#1DB87D',
          600: '#17a36d',
          700: '#138d5d',
          800: '#0f754e',
          900: '#0c5f3f',
        },
        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#eca8f0',
          400: '#e07ae4',
          500: '#c84dd0',
          600: '#a82db3',
          700: '#8b2291',
          800: '#731e77',
          900: '#5e1d62',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        logo: ['Nunito', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
