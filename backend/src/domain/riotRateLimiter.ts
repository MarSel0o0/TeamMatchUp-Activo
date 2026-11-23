// Reglas puras del limitador en ventanas deslizantes para la API de Riot Games
// (spec 014, RF-37, RNF-1; D84, D85; plan, §§2.1, 4 y 5.4).
// Sin timers, red ni reloj interno: `nowMs` llega siempre como parámetro.

/** Tope de consultas en la ventana deslizante de 2 minutos (RF-37, D85). */
export const RATE_LIMIT_2MIN = 100;

/** Duración de la ventana deslizante de 2 minutos en milisegundos. */
export const WINDOW_2MIN_MS = 120_000;

/** Tope de consultas en la ventana deslizante de 1 segundo (RF-37, D85). */
export const RATE_LIMIT_1SEC = 20;

/** Duración de la ventana deslizante de 1 segundo en milisegundos. */
export const WINDOW_1SEC_MS = 1_000;

/** Reserva de consultas al pedir un desafío: Account-v1 + Summoner-v4 (D84). */
export const RESERVE_CREATE = 2;

/** Reserva de consultas al confirmar un desafío: 1 perfil + 1 cuenta + 1 rango + 1 lista + 20 partidas (D84). */
export const RESERVE_CONFIRM = 24;

/** Reserva de consultas al resincronizar una cuenta verificada con Riot (D84). */
export const RESERVE_SYNC = 24;

/**
 * Conserva solo las marcas de tiempo que siguen dentro de la ventana deslizante `(nowMs - windowMs, +∞)`
 * sin mutar el arreglo recibido (D85).
 */
export function pruneTimestamps(
  timestamps: readonly number[],
  windowMs: number,
  nowMs: number,
): number[] {
  const cutoff = nowMs - windowMs;
  return timestamps.filter((timestamp) => timestamp > cutoff);
}

/**
 * Comprueba si caben `requested` consultas nuevas en la ventana deslizante de 2 minutos, contando
 * las ya ejecutadas dentro de los últimos 120 s y las `reservedCount` reservadas por operaciones
 * en curso (RF-37, D84, D85).
 */
export function canReserveIn2Min(
  usedTimestamps: readonly number[],
  reservedCount: number,
  requested: number,
  nowMs: number,
): boolean {
  const activeCount = pruneTimestamps(usedTimestamps, WINDOW_2MIN_MS, nowMs).length;
  return activeCount + reservedCount + requested <= RATE_LIMIT_2MIN;
}

/**
 * Milisegundos que faltan para liberar un hueco en la ventana deslizante de 1 segundo (20/s, D85).
 * Devuelve `0` si ya hay menos de 20 consultas en el último segundo; si hay 20 o más, devuelve el
 * tiempo exacto hasta que la 20.ª más reciente salga de la ventana.
 */
export function waitMsForPerSecondLimit(
  usedTimestamps: readonly number[],
  nowMs: number,
): number {
  const recentDesc = pruneTimestamps(usedTimestamps, WINDOW_1SEC_MS, nowMs).sort((a, b) => b - a);
  const threshold = recentDesc[RATE_LIMIT_1SEC - 1];
  if (threshold === undefined) return 0;
  return Math.max(0, threshold + WINDOW_1SEC_MS - nowMs);
}
