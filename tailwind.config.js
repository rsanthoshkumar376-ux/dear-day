/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        journal: {
          50: '#fbfaf8',
          100: '#f6f3ee',
          200: '#ede6dc',
          300: '#dfd2c1',
          400: '#cbba9f',
          500: '#b49f82',
          600: '#9b8467',
          700: '#7e6a52',
          800: '#675644',
          900: '#544638',
          950: '#2d251d',
        },
        parchment: {
          light: '#fdfbf7',
          dark: '#1c1917',
          cardLight: '#ffffff',
          cardDark: '#292524',
        },
        amberGold: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['Newsreader', 'Lora', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(90, 70, 50, 0.08)',
        'soft-lg': '0 10px 30px -4px rgba(90, 70, 50, 0.12)',
        'dark-soft': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
