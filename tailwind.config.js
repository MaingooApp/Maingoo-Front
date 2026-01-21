/** @type {import('tailwindcss').Config} */
import PrimeUI from 'tailwindcss-primeui';

export default {
  darkMode: ['selector', '[class="app-dark"]'],
  content: ['./src/**/*.{html,ts,scss,css}', './index.html'],
  plugins: [PrimeUI],
  theme: {
    screens: {
      sm: '576px',
      md: '768px',
      lg: '992px',
      xl: '1200px',
      '2xl': '1920px'
    },
    extend: {
      colors: {
        maingoo: {
          deep: '#1A3C34',
          sage: '#6B9E86',
          mint: '#F0F7F4'
        }
      },
      animation: {
        'notification-pulse': 'notification-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        'notification-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' }
        }
      }
    }
  }
};