// Reglas puras del ciclo de vida, selección de ícono y avisos de un desafío de verificación con
// Riot Games (spec 014, RF-1, RF-4, RF-7, RF-9, RF-10, RF-19, RF-21, RF-27, RF-28, RF-43, RF-45;
// D15, D25, D26, D34, D79, D80, D87, D100; plan, §§2.1 y 4).
// Sin Express, Mongoose, red, aleatoriedad propia ni reloj: `now` y `pickIndex` llegan por parámetro.
import { RIOT_NOTICES } from "./riotRules.ts";

/** Bloques de una cuenta verificada con Riot que pueden quedar pendientes (D80, D82). */
export type PendingBlock = "rank" | "matches" | "profile";

/** Los 29 íconos de inicio que toda cuenta de LoL tiene desde que se crea (0..28, D25). */
export const STARTER_ICON_IDS: readonly number[] = Array.from({ length: 29 }, (_, id) => id);

/** Duración de un desafío abierto: 10 minutos (RF-9, D15). */
export const CHALLENGE_TTL_MS = 10 * 60 * 1_000;

/** Retención de desafíos tras vencer, anularse o cerrarse: 24 horas (RF-28, D87). */
export const CHALLENGE_RETENTION_MS = 24 * 60 * 60 * 1_000;

/** Máximo de desafíos creados por usuario en una hora (RF-21, D34). */
export const CHALLENGE_HOURLY_LIMIT = 5;

/** Ventana del límite horario de creación de desafíos: 1 hora (RF-21). */
export const CHALLENGE_HOURLY_WINDOW_MS = 60 * 60 * 1_000;

/** Máximo de confirmaciones contadas por desafío (RF-10, D9). */
export const MAX_CONFIRM_ATTEMPTS = 10;

/** Instante en que vence un desafío creado en `now` (RF-1, RF-9). */
export function challengeExpiry(now: Date): Date {
  return new Date(now.getTime() + CHALLENGE_TTL_MS);
}

/**
 * Instante en que debe borrarse un desafío (RF-28, D87): 24 horas después de vencer, anularse o
 * cerrarse, lo que ocurra primero.
 */
export function challengeDeleteAt(closedOrExpiredAt: Date): Date {
  return new Date(closedOrExpiredAt.getTime() + CHALLENGE_RETENTION_MS);
}

/** Un desafío está vencido a los 10:00 exactos o después (`now >= expiresAt`, RF-9, D15). */
export function isChallengeExpired(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

/** Segundos que le quedan al desafío redondeados hacia arriba; nunca negativo (D100). */
export function remainingSeconds(expiresAt: Date, now: Date): number {
  const diffMs = expiresAt.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / 1_000);
}

/**
 * Íconos de inicio (0..28) que quedan libres tras descontar el equipado en Riot, el del desafío
 * reemplazado y los de desafíos abiertos para la misma cuenta de Riot (RF-19, D25).
 */
export function availableStarterIcons(excluded: Iterable<number>): number[] {
  const excludedSet = new Set(excluded);
  return STARTER_ICON_IDS.filter((id) => !excludedSet.has(id));
}

/**
 * Elige un ícono entre los disponibles usando el generador inyectado `pickIndex(length)`
 * (RF-19). Devuelve `null` sin invocar `pickIndex` si no queda ninguno libre.
 */
export function pickStarterIcon(
  available: readonly number[],
  pickIndex: (length: number) => number,
): number | null {
  if (available.length === 0) return null;
  const index = pickIndex(available.length);
  return available[index] ?? null;
}

/**
 * Límite de 5 desafíos creados en la última hora (RF-21, D34). Filtra los estrictamente dentro de
 * `(now - 1 h, +∞)`; si hay al menos 5, devuelve los milisegundos hasta que el 5.º más reciente
 * (el más antiguo de los 5) cumpla 1 hora; en caso contrario devuelve `null`.
 */
export function hourlyRateLimitWait(createdDates: readonly Date[], now: Date): number | null {
  const nowMs = now.getTime();
  const windowStartMs = nowMs - CHALLENGE_HOURLY_WINDOW_MS;
  const recentMs = createdDates
    .map((date) => date.getTime())
    .filter((ts) => ts > windowStartMs)
    .sort((a, b) => b - a);

  const fifthMostRecent = recentMs[CHALLENGE_HOURLY_LIMIT - 1];
  if (fifthMostRecent === undefined) return null;
  return fifthMostRecent + CHALLENGE_HOURLY_WINDOW_MS - nowMs;
}

/**
 * Milisegundos hasta que venza el desafío abierto más antiguo de la cuenta de Riot cuando no
 * quedan íconos libres (RF-43, D26): el menor `expiresAt > now`. Devuelve `0` si no hay ninguno
 * futuro.
 */
export function noFreeIconsWait(openExpiresAt: readonly Date[], now: Date): number {
  const nowMs = now.getTime();
  let earliestMs: number | null = null;
  for (const expiresAt of openExpiresAt) {
    const ts = expiresAt.getTime();
    if (ts > nowMs && (earliestMs === null || ts < earliestMs)) {
      earliestMs = ts;
    }
  }
  return earliestMs === null ? 0 : earliestMs - nowMs;
}

/**
 * Aviso de confirmación según los bloques que quedaron pendientes (RF-7, RF-27, D79, D80, D82):
 * - sin pendientes → `undefined` (RF-7);
 * - faltan rango y partidas (falte o no perfil) → aviso de «no pudimos leer sus datos»;
 * - cualquier otra combinación con al menos un pendiente (incluido solo perfil) → aviso de
 *   «no pudimos leer algunos de sus datos».
 */
export function challengeConfirmNotice(pendingBlocks: readonly PendingBlock[]): string | undefined {
  if (pendingBlocks.length === 0) return undefined;
  const missingRank = pendingBlocks.includes("rank");
  const missingMatches = pendingBlocks.includes("matches");
  if (missingRank && missingMatches) return RIOT_NOTICES.verifiedNoData;
  return RIOT_NOTICES.verifiedPartialData;
}
