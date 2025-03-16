// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: 'dist',  // Specify output directory for the build
  },
  server: {
    host: '0.0.0.0', // Bind to all network interfaces so it can be accessed from outside the container
    port: 5173,      // Default port for Vite
  },
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],  // Exclude lucide-react from dependency optimization
  },
});
