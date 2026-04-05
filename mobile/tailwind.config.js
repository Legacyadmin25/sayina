/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#DAB44A', // Sayina gold/amber color
        secondary: '#333333',
        accent: '#4CAF50',
        background: '#F5F5F5',
        surface: '#FFFFFF',
        error: '#B00020',
      },
      fontFamily: {
        sans: ['System', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
