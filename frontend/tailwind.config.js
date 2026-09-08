/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        gh: {
          bg: "#0d1117",
          panel: "#161b22",
          subpanel: "#21262d",
          border: "#30363d",
          borderMuted: "#21262d",
          text: "#f0f6fc",
          secondary: "#8b949e",
          muted: "#6e7681",
          blue: "#58a6ff",
          green: "#238636",
          greenHover: "#2ea043",
          red: "#f85149",
          orange: "#d29922",
          purple: "#bc8cff",
          gold: "#e3b341",
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'SF Mono', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', '"Noto Sans"', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
