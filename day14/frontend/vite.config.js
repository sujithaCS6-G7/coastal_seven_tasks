import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Day 14: Vite Configuration with Rollup Manual Chunks for Code-Splitting & Bundle Optimization
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    open: false,
    host: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'state-query-vendor': ['zustand', '@tanstack/react-query', 'axios'],
          'ui-icons-vendor': ['lucide-react', 'clsx', 'tailwind-merge'],
        },
      },
    },
  },
});
