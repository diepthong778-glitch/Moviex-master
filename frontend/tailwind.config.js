export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#050509',
        carbon: '#0b0b12',
        ember: '#e50914',
        emberSoft: '#ff4d5a',
        slate: '#a6a6bf',
      },
      fontFamily: {
        display: ['"Poppins"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        floatSlow: 'floatSlow 6s ease-in-out infinite',
        fadeUp: 'fadeUp 0.8s ease-out both',
        glowPulse: 'glowPulse 3.5s ease-in-out infinite',
      },
      boxShadow: {
        card: '0 20px 60px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
