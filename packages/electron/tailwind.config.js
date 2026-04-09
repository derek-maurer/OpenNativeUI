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
        // Semantic theme tokens (switch via CSS variables in global.css)
        base:          "var(--bg-base)",
        sidebar:       "var(--bg-sidebar)",
        surface:       "var(--bg-surface)",
        elevated:      "var(--bg-elevated)",
        bubble:        "var(--bg-bubble)",
        hover:         "var(--bg-hover)",
        fg:            "var(--fg-primary)",
        secondary:     "var(--fg-secondary)",
        muted:         "var(--fg-muted)",
        dim:           "var(--fg-dim)",
        line:          "var(--border)",
        "line-strong": "var(--border-strong)",
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
