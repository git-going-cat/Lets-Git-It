import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [tailwindcss(), tanstackRouter({ routeFileIgnorePattern: 'paths\\.ts' }), react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL ?? 'http://localhost:8080',
          changeOrigin: true,
        },
        '/ws': {
          target: env.VITE_WS_URL ?? 'ws://localhost:8080',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/phaser')) return 'phaser';
            if (id.includes('/node_modules/@sentry') || id.includes('/node_modules/posthog-js'))
              return 'monitoring';
            if (id.includes('/node_modules/react') || id.includes('/node_modules/@tanstack'))
              return 'vendor';
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  };
});
