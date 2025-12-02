/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0D1117',
        panel: '#1A1F25',
        primary: '#3D9BFF',
        warning: '#FF6D6D',
        text: '#E6EDF3',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Text', 'IBM Plex Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [
    require("tailwindcss-animate")
  ],
}
