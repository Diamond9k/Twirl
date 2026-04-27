/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        twirl: {
          pink: "#F472B6",
          rose: "#FB7185",
          blush: "#FDE8EF",
          cream: "#FFF9F5",
          plum: "#7C3AED",
          text: "#1C1024",
          muted: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
