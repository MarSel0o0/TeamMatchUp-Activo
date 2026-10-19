import { NO_MESSAGE_TEXT } from '@/shared/utils/copy';
import { readErrorMessage } from './errorBody';
import { emitUnauthorized } from './sessionEvents';

/**
 * Transporte común del cliente HTTP y del backend simulado (plan 3.3): plazo de
 * 30 segundos por petición, registro de peticiones en vuelo, época de la sesión
 * del cliente, descarte de respuestas tardías y clasificación de errores. Al
 * pasar los dos modos por el mismo `execute`, el plazo, el 401 y los errores se
 * comportan igual con el servidor real y en modo simulado.
 */

/** Plazo de toda petición (RF-20); cubre también la lectura del cuerpo. */
export const REQUEST_TIMEOUT_MS = 30_000;

/** Mensaje de un 401 que llega sin cuerpo legible (spec 002, RF-11). */
const DEFAULT_UNAUTHORIZED_MESSAGE = 'sesión no iniciada';

/**
 * Error del servidor. `status` es 0 cuando no hubo respuesta (red, plazo,
 * interrupción). `hasMessage` distingue el error con mensaje del servidor del
 * error sin mensaje, cuyo texto es el fijo de la spec (RF-9).
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
    readonly hasMessage: boolean = true,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * La respuesta llegó (o se esperaba) después de limpiar la sesión del cliente.
 * Nadie la muestra: los avisos y los formularios la ignoran con `isSessionCleared`.
 */
export class SessionClearedError extends Error {
  constructor() {
    super('La sesión del cliente se limpió antes de recibir la respuesta.');
    this.name = 'SessionClearedError';
  }
}

export function isSessionCleared(error: unknown): error is SessionClearedError {
  return error instanceof SessionClearedError;
}

/** Lo mínimo que el transporte lee de las cabeceras (`Headers` lo cumple). */
export interface HeaderReader {
  get(name: string): string | null;
}

/** Respuesta cruda, ya leída por completo: estado, texto del cuerpo y cabeceras. */
export interface RawResponse {
  status: number;
  text: string;
  headers?: HeaderReader;
}

export interface ExecuteOptions {
  /** `true` si un 401 significa sesión vencida (RF-7); las operaciones públicas pasan `false`. */
  protectedCall: boolean;
  /** Cancelación externa (TanStack Query); su error se relanza tal cual. */
  signal?: AbortSignal;
  /** Mensaje de un 401 sin cuerpo legible; por defecto el de la spec 002. */
  unauthorizedMessage?: string;
}

export interface ExecuteResult<T> {
  body: T;
  headers: HeaderReader;
}

const NO_HEADERS: HeaderReader = { get: () => null };

/** Época de la sesión del cliente: sube cada vez que se limpia la sesión. */
let epoch = 0;
const inFlight = new Set<AbortController>();

export function currentEpoch(): number {
  return epoch;
}

/**
 * Parte de limpiar la sesión del cliente (definiciones de la spec): cancela las
 * peticiones en vuelo y descarta las respuestas que lleguen de todos modos.
 */
export function abortAllRequests(): void {
  epoch += 1;
  for (const controller of [...inFlight]) controller.abort();
  inFlight.clear();
}

/** Registra la petición, aplica el plazo y clasifica el resultado (plan 3.3). */
export async function execute<T>(
  run: (signal: AbortSignal) => Promise<RawResponse>,
  options: ExecuteOptions,
): Promise<ExecuteResult<T>> {
  const epochAtStart = epoch;
  const controller = new AbortController();
  inFlight.add(controller);
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const externalSignal = options.signal;
  const forwardAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', forwardAbort, { once: true });
  }

  // La carrera con la señal garantiza el plazo aunque `run` no mire la señal
  // (el backend simulado espera con temporizadores propios).
  const aborted = new Promise<never>((_, reject) => {
    controller.signal.addEventListener(
      'abort',
      () => reject(new DOMException('La petición se canceló.', 'AbortError')),
      { once: true },
    );
  });

  let raw: RawResponse;
  try {
    raw = await Promise.race([run(controller.signal), aborted]);
  } catch (error) {
    if (epochAtStart !== epoch) throw new SessionClearedError();
    if (externalSignal?.aborted) throw error;
    // Red, plazo vencido o petición interrumpida: error sin mensaje (RF-9, RF-20).
    throw new ApiError(NO_MESSAGE_TEXT, 0, undefined, false);
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener('abort', forwardAbort);
    inFlight.delete(controller);
  }

  // Respuesta tardía tras limpiar la sesión: se descarta sin mostrarla (HU-3).
  if (epochAtStart !== epoch) throw new SessionClearedError();

  if (raw.status === 401) {
    if (options.protectedCall) emitUnauthorized(epochAtStart);
    // Un 401 nunca es un error sin mensaje: se trata por su código.
    const message =
      readErrorMessage(raw.text) ?? options.unauthorizedMessage ?? DEFAULT_UNAUTHORIZED_MESSAGE;
    throw new ApiError(message, 401);
  }

  if (raw.status >= 200 && raw.status < 300) {
    const headers = raw.headers ?? NO_HEADERS;
    if (raw.status === 204) return { body: undefined as T, headers };
    try {
      return { body: JSON.parse(raw.text) as T, headers };
    } catch {
      // Cuerpo exitoso que no es JSON (por ejemplo, HTML de un proxy).
      throw new ApiError(NO_MESSAGE_TEXT, raw.status, undefined, false);
    }
  }

  const message = readErrorMessage(raw.text);
  throw new ApiError(message ?? NO_MESSAGE_TEXT, raw.status, undefined, message !== null);
}
