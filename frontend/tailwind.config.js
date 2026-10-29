/** @type {import("tailwindcss").Config} */
const wisdom = {
  50: '#eef0ff',
  100: '#e0e3ff',
  200: '#c6caff',
  300: '#a3a7ff',
  400: '#7f82f7',
  500: '#5d5fe8',
  600: '#3f40c9',
  700: '#2a2c96',
  800: '#202289',
  900: '#171a6b',
  950: '#0e0f45',
};

const accent = {
  50: '#fff7ed',
  100: '#ffedd5',
  200: '#fed7aa',
  300: '#fdba74',
  400: '#fb923c',
  500: '#ed8722',
  600: '#cf7310',
  700: '#a3580b',
  800: '#7c430c',
  900: '#66390e',
  950: '#3a1d04',
};

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#171a6b',
          ...wisdom,
        },
        blue: wisdom,
        accent: {
          DEFAULT: '#ed8722',
          ...accent,
        },
        ink: '#111111',
        stone: '#565656',
        line: '#e5e5e5',
        ivory: '#f7f7f4',
        forest: {
          DEFAULT: '#202289',
          deep: '#171a6b',
          soft: '#2a2c96',
        },
        navy: {
          DEFAULT: '#14165a',
          deep: '#0e0f45',
        },
        slate: {
          50: '#f7f7f4',
          100: '#f1f1ed',
          200: '#e5e5e5',
          300: '#d6d6d1',
          400: '#a8a8a2',
          500: '#7a7a74',
          600: '#565656',
          700: '#3f3f3f',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Ethiopic', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'Noto Sans Ethiopic', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '3px',
        lg: '4px',
        xl: '6px',
        '2xl': '8px',
        '3xl': '12px',
      },
    },
  },
  plugins: [],
}
