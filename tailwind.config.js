/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./templates/**/*.html"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#0D1B2A",
        secondary: "#1B263B",
        accent: "#415A77",
        highlight: "#778DA9",
        "text-main": "#E0E1DD",
        "text-secondary": "#B0B5BD",
        "cyan-glow": "#00BFFF",
      },
    },
  },
  plugins: [],
};
