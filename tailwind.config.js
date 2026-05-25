/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        twirl: {
          // Design spec canonical names
          paper:      "#FDFAF4",
          cream:      "#FBF5EC",
          blush:      "#F7E4DE",
          ink:        "#2A1F26",
          "ink-2":    "#5A4A54",
          muted:      "#A89AA0",
          line:       "#E8DDD4",
          rose:       "#E56A8A",
          "rose-deep":"#B84565",
          clay:       "#C97B5C",
          plum:       "#6B4578",
          gold:       "#B8945A",
          moss:       "#6B7F5C",
          amber:      "#C89A3C",
          // Legacy aliases — existing screens reference these; do not remove
          pink:       "#E56A8A",   // = rose
          text:       "#2A1F26",   // = ink
          ink2:       "#5A4A54",   // = ink-2
        },
        status: {
          "pending-bg":   "#FAEFD4",
          "pending-fg":   "#8A6A1E",
          "active-bg":    "#E5EADD",
          "active-fg":    "#425133",
          "completed-bg": "#EDE6DE",
          "completed-fg": "#6B5E52",
          "declined-bg":  "#F1E0E0",
          "declined-fg":  "#7B4141",
        },
      },
      fontFamily: {
        serif:          ["CormorantGaramond_500Medium"],
        "serif-italic": ["CormorantGaramond_500Medium_Italic"],
        sans:           ["Inter_400Regular"],
        "sans-medium":  ["Inter_500Medium"],
        "sans-semibold":["Inter_600SemiBold"],
        mono:           ["JetBrainsMono_500Medium"],
      },
      fontSize: {
        h2:        [44,  { lineHeight: 42, letterSpacing: -1 }],
        h3:        [32,  { lineHeight: 30, letterSpacing: -0.5 }],
        h4:        [22,  { lineHeight: 23, letterSpacing: -0.3 }],
        "body-l":  [16,  { lineHeight: 24 }],
        "body":    [14,  { lineHeight: 21 }],
        btn:       [15,  { lineHeight: 15, letterSpacing: 0.2 }],
        eyebrow:   [10,  { lineHeight: 10, letterSpacing: 1.8 }],
        "mono-xs": [8,   { lineHeight: 8,  letterSpacing: 1.5 }],
      },
      borderRadius: {
        card:   18,
        btn:    14,
        input:  12,
        pill:   999,
        tabbar: 24,
      },
    },
  },
  plugins: [],
};
