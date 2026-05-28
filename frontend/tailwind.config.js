/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#dce7ff',
          200: '#b9cfff',
          300: '#8aadff',
          400: '#5680ff',
          500: '#3355ff',
          600: '#1a32f5',
          700: '#1525e1',
          800: '#1720b6',
          900: '#1a2390',
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
      },
    },
  },
  plugins: [],
};
