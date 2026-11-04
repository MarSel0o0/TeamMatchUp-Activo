import { isMockEnabled } from './mockFlag';

/**
 * Lectura centralizada de la configuración de entorno.
 *
 * Por defecto la interfaz habla con el servidor real (`apiUrl`, `/api` si no se
 * define `VITE_API_URL`). El backend simulado en memoria solo se activa con
 * `VITE_USE_MOCK_API=true` (RF-1). Los valores se evalúan una vez al arrancar o
 * construir la aplicación y no cambian en caliente.
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? '').trim() || '/api',
  mockLatency: Number(import.meta.env.VITE_MOCK_LATENCY ?? 350),
  useMockApi: isMockEnabled(import.meta.env.VITE_USE_MOCK_API),
} as const;

export const STORAGE_KEYS = {
  csrf: 'tmu.csrf',
  sessionSignal: 'tmu.session-signal',
  mockDb: 'tmu.mock-db.v3',
  theme: 'tmu.theme',
} as const;
