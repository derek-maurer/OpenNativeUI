/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/**/*.{ts,tsx}",
    "./src/renderer/index.html",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#10a37f",
      },
      animation: {
        "bounce-dot": "bounceDot 1.4s infinite ease-in-out",
      },
      keyframes: {
        bounceDot: {
          "0%, 80%, 100%": { transform: "scale(0)", opacity: "0.3" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
