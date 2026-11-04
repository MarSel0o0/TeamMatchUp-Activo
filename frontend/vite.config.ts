import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite no copia `.env` a `process.env` al evaluar este archivo: hay que leerlo con loadEnv.
  // Prefijo '' para incluir VITE_PROXY_TARGET aunque no se exponga al cliente.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    process.env.VITE_PROXY_TARGET ?? fileEnv.VITE_PROXY_TARGET ?? 'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Cuando exista el backend Express, `npm run dev` proxea /api hacia él
      // y no hace falta tocar el código de la app.
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
