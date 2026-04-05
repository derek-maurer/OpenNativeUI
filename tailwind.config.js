/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#10a37f", dark: "#1a7f64" },
        surface: { light: "#ffffff", dark: "#171717" },
        sidebar: { light: "#f9f9f9", dark: "#0d0d0d" },
        bubble: {
          user: { light: "#f4f4f4", dark: "#2f2f2f" },
          assistant: { light: "#ffffff", dark: "#171717" },
        },
      },
    },
  },
  plugins: [],
};
