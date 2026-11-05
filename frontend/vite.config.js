import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'esnext',
    minify: false, // Disables memory-heavy minification for low-RAM laptops
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
});
