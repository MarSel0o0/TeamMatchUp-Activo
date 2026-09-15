/**
 * Lectura centralizada de la configuración de entorno.
 *
 * `apiUrl` vacío significa "todavía no hay servidor Express": la aplicación
 * usa entonces el backend simulado en memoria. Al definir `VITE_API_URL` la
 * misma app pasa a hablar HTTP sin cambiar ni un componente.
 */
export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? '').trim(),
  mockLatency: Number(import.meta.env.VITE_MOCK_LATENCY ?? 350),
  get useMockApi(): boolean {
    return this.apiUrl === '';
  },
} as const;

export const STORAGE_KEYS = {
  token: 'tmu.token',
  mockDb: 'tmu.mock-db',
} as const;
