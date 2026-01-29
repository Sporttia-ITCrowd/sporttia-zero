import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { existsSync } from 'fs';

// Detect if running inside Docker container
const isDocker = existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true';

// Use Docker service names when inside Docker, localhost otherwise
// Note: Using PROXY_ prefix instead of VITE_ to avoid exposing to client-side code
const apiTarget = process.env.PROXY_API_URL || (isDocker ? 'http://api:4500' : 'http://localhost:4500');
const adminTarget = process.env.PROXY_ADMIN_URL || (isDocker ? 'http://admin:4502' : 'http://localhost:4502');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4501,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/manager': {
        target: adminTarget,
        changeOrigin: true,
      },
    },
  },
});
