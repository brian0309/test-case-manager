/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000',
          light: '#333333',
          dark: '#000000',
          contrast: '#ffffff',
          darkMode: '#3b3b3b',
          darkModeHover: '#4a4a4a',
          darkModeContrast: '#ffffff'
        },
        secondary: {
          DEFAULT: '#666666',
          light: '#999999',
          dark: '#333333',
          contrast: '#ffffff',
          darkMode: '#525252',
          darkModeHover: '#6b6b6b',
          darkModeContrast: '#ffffff'
        },
        background: {
          DEFAULT: '#ffffff',
          paper: '#f5f5f5',
          dark: '#1a1a1a',
          darkPaper: '#242424',
          darkElevated: '#2d2d2d'
        },
        text: {
          primary: '#000000',
          secondary: '#666666',
          disabled: '#999999',
          contrast: '#ffffff',
          darkPrimary: '#f5f5f5',
          darkSecondary: '#a0a0a0',
          darkDisabled: '#6b6b6b',
          darkContrast: '#1a1a1a'
        },
        error: {
          DEFAULT: '#d32f2f',
          light: '#ef5350',
          dark: '#c62828',
          darkMode: '#ef5350',
          darkModeBg: 'rgba(239, 83, 80, 0.15)'
        },
        success: {
          DEFAULT: '#2e7d32',
          light: '#4caf50',
          dark: '#1b5e20',
          darkMode: '#81c784',
          darkModeBg: 'rgba(129, 199, 132, 0.15)'
        },
        warning: {
          DEFAULT: '#ed6c02',
          light: '#ff9800',
          dark: '#e65100',
          darkMode: '#ffb74d',
          darkModeBg: 'rgba(255, 183, 77, 0.15)'
        },
        info: {
          DEFAULT: '#0288d1',
          light: '#03a9f4',
          dark: '#01579b',
          darkMode: '#4fc3f7',
          darkModeBg: 'rgba(79, 195, 247, 0.15)'
        },
        system: {
          blue: '#007AFF',
          gray: '#8E8E93',
          red: '#FF3B30',
          green: '#34C759',
          orange: '#FF9500',
          yellow: '#FFCC00',
          purple: '#AF52DE',
          teal: '#5AC8FA',
          indigo: '#5856D6',
          pink: '#FF2D55',
          darkBlue: '#0A84FF',
          darkRed: '#FF453A',
          darkGreen: '#30D158',
          darkYellow: '#FFD60A'
        }
      },
      backgroundColor: theme => ({
        ...theme('colors'),
        'primary': theme('colors.primary.DEFAULT'),
        'secondary': theme('colors.secondary.DEFAULT'),
        'background': theme('colors.background.DEFAULT'),
        'paper': theme('colors.background.paper'),
        'error': theme('colors.error.DEFAULT'),
        'success': theme('colors.success.DEFAULT'),
        'warning': theme('colors.warning.DEFAULT'),
        'info': theme('colors.info.DEFAULT'),
        'background-dark': theme('colors.background.dark'),
        'background-darkPaper': theme('colors.background.darkPaper'),
        'background-darkElevated': theme('colors.background.darkElevated'),
        'primary-darkMode': theme('colors.primary.darkMode'),
        'secondary-darkMode': theme('colors.secondary.darkMode')
      }),
      textColor: theme => ({
        ...theme('colors'),
        'primary': theme('colors.text.primary'),
        'secondary': theme('colors.text.secondary'),
        'disabled': theme('colors.text.disabled'),
        'contrast': theme('colors.text.contrast'),
        'error': theme('colors.error.DEFAULT'),
        'success': theme('colors.success.DEFAULT'),
        'warning': theme('colors.warning.DEFAULT'),
        'info': theme('colors.info.DEFAULT'),
        'text-darkPrimary': theme('colors.text.darkPrimary'),
        'text-darkSecondary': theme('colors.text.darkSecondary'),
        'text-darkDisabled': theme('colors.text.darkDisabled')
      }),
      borderColor: theme => ({
        ...theme('colors'),
        'primary': theme('colors.primary.DEFAULT'),
        'secondary': theme('colors.secondary.DEFAULT'),
        'error': theme('colors.error.DEFAULT'),
        'success': theme('colors.success.DEFAULT'),
        'warning': theme('colors.warning.DEFAULT'),
        'info': theme('colors.info.DEFAULT'),
        'darkMode': theme('colors.background.darkPaper')
      })
    },
  },
  plugins: [],
};
