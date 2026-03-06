export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        hive: {
          bg: '#050505',
          panel: '#111111',
          gold: '#F5A623',
          'gold-dim': 'rgba(245, 166, 35, 0.15)',
          mint: '#00E676',
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      }
    },
  },
  plugins: [],
}
