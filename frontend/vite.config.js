import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    emptyOutDir: true,
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/main.css';
          }

          return 'assets/[name][extname]';
        },
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return 'vendor';
          }

          return undefined;
        },
      },
    },
  },
});
