/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000',
          light: '#333333',
          dark: '#000000',
          contrast: '#ffffff'
        },
        secondary: {
          DEFAULT: '#666666',
          light: '#999999',
          dark: '#333333',
          contrast: '#ffffff'
        },
        background: {
          DEFAULT: '#ffffff',
          paper: '#f5f5f5',
          dark: '#121212'
        },
        text: {
          primary: '#000000',
          secondary: '#666666',
          disabled: '#999999',
          contrast: '#ffffff'
        },
        error: {
          DEFAULT: '#d32f2f',
          light: '#ef5350',
          dark: '#c62828'
        },
        success: {
          DEFAULT: '#2e7d32',
          light: '#4caf50',
          dark: '#1b5e20'
        },
        warning: {
          DEFAULT: '#ed6c02',
          light: '#ff9800',
          dark: '#e65100'
        },
        info: {
          DEFAULT: '#0288d1',
          light: '#03a9f4',
          dark: '#01579b'
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
        'info': theme('colors.info.DEFAULT')
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
        'info': theme('colors.info.DEFAULT')
      }),
      borderColor: theme => ({
        ...theme('colors'),
        'primary': theme('colors.primary.DEFAULT'),
        'secondary': theme('colors.secondary.DEFAULT'),
        'error': theme('colors.error.DEFAULT'),
        'success': theme('colors.success.DEFAULT'),
        'warning': theme('colors.warning.DEFAULT'),
        'info': theme('colors.info.DEFAULT')
      })
    },
  },
  plugins: [],
  darkMode: 'class',
};
