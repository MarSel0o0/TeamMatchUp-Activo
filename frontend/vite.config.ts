import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import type { Plugin } from 'vite';
import { THEME_STORAGE_KEY } from './src/config/themeKey';
import { buildBootScript } from './src/domain/themeChoice';

/**
 * Inyecta en `<head>` el script que fija el tema antes de la primera pintura (spec 017, RF-5, RNF-6,
 * RNF-8). El texto sale de `domain/themeChoice.ts`, la misma función que prueba Vitest, y se sirve igual
 * en `npm run dev` y en `npm run build`. Va al final de `<head>` (no al principio): `<meta charset>` debe
 * quedar en los primeros 1024 bytes, y el script, de más de 1 kB, los pasaría. Sigue siendo un script
 * clásico y bloqueante, así que corre antes de la primera pintura.
 */
function themeBootPlugin(): Plugin {
  return {
    name: 'tmu-theme-boot',
    transformIndexHtml() {
      return [{ tag: 'script', children: buildBootScript(THEME_STORAGE_KEY), injectTo: 'head' }];
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite no copia `.env` a `process.env` al evaluar este archivo: hay que leerlo con loadEnv.
  // Prefijo '' para incluir VITE_PROXY_TARGET aunque no se exponga al cliente.
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const proxyTarget =
    process.env.VITE_PROXY_TARGET ?? fileEnv.VITE_PROXY_TARGET ?? 'http://localhost:3001'; // PORT de backend/.env.example

  return {
    plugins: [themeBootPlugin(), react()],
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
