/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          main: '#2196f3',
          light: '#64b5f6',
          dark: '#1976d2',
        },
        secondary: {
          main: '#f50057',
          light: '#ff4081',
          dark: '#c51162',
        },
      },
      spacing: {
        'drawer': '280px',
      },
    },
  },
  plugins: [],
}