/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sayina brand colors based on the logo
        primary: {
          50: '#faf6e5',
          100: '#f5edcc',
          200: '#eed9a0',
          300: '#e6c673',
          400: '#dfb347',
          500: '#DAB44A', // Main gold/amber color from logo
          600: '#c7a342',
          700: '#a48637',
          800: '#81692c',
          900: '#5e4c20',
          950: '#3b3013',
        },
        secondary: {
          900: '#000000', // Black from logo
          800: '#1a1a1a',
          700: '#333333',
          600: '#4d4d4d',
          500: '#666666',
          400: '#808080',
          300: '#999999',
          200: '#b3b3b3',
          100: '#cccccc',
          50: '#e6e6e6',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'sans-serif'],
        serif: ['var(--font-merriweather)', 'Merriweather', 'serif'],
      },
    },
  },
  plugins: [],
}
