import { env } from '@/config/env';
import { readCsrf } from './csrfStorage';
import { execute, type ExecuteResult, type RawResponse } from './transport';

// Los errores viven en el transporte (los comparte el backend simulado); se
// reexportan aquí para que el resto importe desde un solo lugar.
export { ApiError, SessionClearedError, isSessionCleared } from './transport';

/** Cabecera del comprobante anti-CSRF (spec 002, RF-11). */
export const CSRF_HEADER = 'X-CSRF-Token';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  query?: Record<string, string | number | boolean | undefined>;
  /** `false` en las operaciones públicas: su 401 no es sesión vencida (RF-7). Por defecto `true`. */
  protectedCall?: boolean;
  /** Mensaje de un 401 sin cuerpo legible (el inicio de sesión fija el suyo). */
  unauthorizedMessage?: string;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = env.apiUrl.replace(/\/$/, '');
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(key, String(value));
  }
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
}

/**
 * Único punto por el que la aplicación habla con el servidor Express.
 * Centraliza la URL base, el comprobante anti-CSRF y el manejo de errores para
 * que ningún componente tenga que conocer esos detalles. La credencial de
 * sesión viaja solo en una cookie `HttpOnly` del mismo origen: el código de la
 * página nunca la ve (RF-2). El plazo, el 401 y la clasificación de errores
 * los resuelve `execute`.
 */
export async function requestWithHeaders<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ExecuteResult<T>> {
  const url = buildUrl(path, options.query);

  const run = async (signal: AbortSignal): Promise<RawResponse> => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    // También en las peticiones públicas: el cierre de sesión lo envía si lo hay (RF-3).
    const csrf = readCsrf();
    if (csrf !== null) headers[CSRF_HEADER] = csrf;

    const response = await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      credentials: 'same-origin',
      signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    // El cuerpo se lee aquí dentro: el plazo de 30 s cubre también esta lectura.
    const text = await response.text();
    return { status: response.status, text, headers: response.headers };
  };

  return execute<T>(run, {
    protectedCall: options.protectedCall ?? true,
    signal: options.signal,
    unauthorizedMessage: options.unauthorizedMessage,
  });
}

/** Como `requestWithHeaders`, pero solo devuelve el cuerpo (la mayoría de las operaciones). */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body } = await requestWithHeaders<T>(path, options);
  return body;
}
