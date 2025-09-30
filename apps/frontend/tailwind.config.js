const config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0E7490',
          foreground: '#ffffff'
        },
        success: '#0f766e',
        warning: '#f97316',
        danger: '#dc2626'
      }
    }
  },
  plugins: []
};

module.exports = config;
