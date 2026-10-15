/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lime: {
          DEFAULT: '#A6E22E',
          dark: '#8FC91E',
          light: '#C4F25E',
        },
        sand: {
          DEFAULT: '#F4E9D8',
          burnt: '#E8D5B5',
          dark: '#D4C4A0',
        },
        ink: '#1F2623',
        sea: {
          DEFAULT: '#1E8FB5',
          dark: '#16708C',
          light: '#4DB5D8',
        },
        sunset: '#FF8A3D',
        foam: '#FFFDF8',
      },
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        marker: ['Permanent Marker', 'cursive'],
        body: ['Inter', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounceSlow 2.5s ease-in-out infinite',
        'marquee': 'marquee 30s linear infinite',
        'count-up': 'countUp 0.8s ease-out forwards',
        'float-up': 'floatUp 0.5s ease-out forwards',
        'spin-slow': 'spin 20s linear infinite',
        'ken-burns': 'kenBurns 20s ease-out forwards',
      },
      keyframes: {
        bounceSlow: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(8deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        kenBurns: {
          '0%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        floatUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
