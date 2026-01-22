import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
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
                target: 'http://localhost:4500',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
            '/manager': {
                target: 'http://localhost:4502',
                changeOrigin: true,
            },
        },
    },
});
