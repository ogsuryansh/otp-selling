/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./**/*.html",
    "./assets/**/*.js",
    "./admin/**/*.html",
    "./dashboard/**/*.html",
    "./services/**/*.html",
    "./servers/**/*.html",
    "./users/**/*.html",
    "./transactions/**/*.html",
    "./promo-codes/**/*.html",
    "./api-config/**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2563eb',
        secondary: '#1e40af',
        accent: '#3b82f6'
      }
    },
  },
  plugins: [],
}
