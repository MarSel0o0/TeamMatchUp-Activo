import { env } from '@/config/env';
import type { ApiContract } from './apiContract';
import { httpApi } from './http/httpApi';
import { mockApi } from './mock/mockApi';

/**
 * Punto de entrada único a los datos.
 *
 * Los componentes importan siempre `api` y nunca saben si detrás hay un
 * servidor real o el backend simulado. Por defecto es el servidor real; el
 * backend simulado se activa solo con `VITE_USE_MOCK_API=true`.
 */
export const api: ApiContract = env.useMockApi ? mockApi : httpApi;

export { ApiError, isSessionCleared } from './http/httpClient';
export type * from './apiContract';
