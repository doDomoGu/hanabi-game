import { defineConfig, loadEnv } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');

  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [vue()],
    server: {
      port: 8090,
      proxy: {
        '/api': {
          target: 'http://localhost:3011',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://localhost:3011',
          ws: true,
        },
      },
    },
  };
});
