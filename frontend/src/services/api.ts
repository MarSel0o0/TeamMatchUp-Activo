import { env } from '@/config/env';
import type { ApiContract } from './apiContract';
import { httpApi } from './http/httpApi';
import { mockApi } from './mock/mockApi';

/**
 * Punto de entrada único a los datos.
 *
 * Los componentes importan siempre `api` y nunca saben si detrás hay un
 * servidor real o el backend simulado. Cambiar de uno a otro es cuestión de
 * definir `VITE_API_URL`.
 */
export const api: ApiContract = env.useMockApi ? mockApi : httpApi;

export { ApiError } from './http/httpClient';
export type * from './apiContract';
