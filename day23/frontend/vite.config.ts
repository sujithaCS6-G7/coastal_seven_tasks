import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const securityHeaders = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: http://localhost:8005 http://127.0.0.1:8005 http://localhost:8004 http://127.0.0.1:8004 http://localhost:8003 http://127.0.0.1:8003 https:; connect-src 'self' http://localhost:8005 http://127.0.0.1:8005 ws://localhost:8005 ws://127.0.0.1:8005 http://localhost:8004 http://127.0.0.1:8004 ws://localhost:8004 ws://127.0.0.1:8004 http://localhost:8003 ws://localhost:8003; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
};

const apiProxy = {
  '/products': { target: 'http://localhost:8005', changeOrigin: true },
  '/cart': { target: 'http://localhost:8005', changeOrigin: true },
  '/orders': { target: 'http://localhost:8005', changeOrigin: true },
  '/auth': { target: 'http://localhost:8005', changeOrigin: true },
  '/ai': { target: 'http://localhost:8005', changeOrigin: true },
  '/tasks': { target: 'http://localhost:8005', changeOrigin: true },
  '/uploads': { target: 'http://localhost:8005', changeOrigin: true },
  '/telemetry': { target: 'http://localhost:8005', changeOrigin: true },
  '/ws': { target: 'http://localhost:8005', ws: true, changeOrigin: true },
};

// https://vitejs.dev/config/
export default defineConfig({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plugins: [react() as any],
  cacheDir: './.vite',
  server: {
    host: '0.0.0.0',
    port: 5182,
    open: false,
    allowedHosts: true,
    headers: securityHeaders,
    proxy: apiProxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 5182,
    open: false,
    allowedHosts: true,
    headers: securityHeaders,
    proxy: apiProxy,
  },

  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query-state': ['@tanstack/react-query', 'zustand', 'axios'],
          'vendor-forms': ['react-hook-form', 'zod', '@hookform/resolvers'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
  },
});
