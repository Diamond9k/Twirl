/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        twirl: {
          pink: "#E56A8A",
          rose: "#B84565",
          blush: "#F7E4DE",
          cream: "#FBF5EC",
          paper: "#FDFAF4",
          plum: "#6B4578",
          clay: "#C97B5C",
          text: "#2A1F26",
          ink2: "#5A4A54",
          muted: "#A89AA0",
          line: "#E8DDD4",
          gold: "#B8945A",
        },
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
