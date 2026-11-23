// Fuentes reales inyectables (spec 012, RF-15, RF-19, RF-20, RF-21, RNF-1, RNF-5; plan, P12-5).
// - Una fuente real (Steam, spec 013; Riot Games, spec 014) se registra por juego y se pasa a
//   `createApp`. Sin fuentes la aplicación funciona igual: las cuentas verificadas responden
//   "no disponible" al resincronizar y las demás no cambian (RF-20).
// - Las pruebas inyectan fuentes falsas y nunca tocan la red (RNF-1).
// - Este módulo no lee `process.env` ni conoce ninguna fuente concreta.
// - Spec 015 (plan, sección 2): `withTimeout` es el plazo común; `readWithTimeout` lo aplica a una
//   fuente de la 012 y `readPremierWithTimeout` a Leetify, que no es una `RealSource` (P15-4).
import type { GameId } from "../domain/games.ts";
import type { LeetifyMatchesReading, LeetifyReading } from "../domain/leetify.ts";
import type { SourceId } from "../domain/sources.ts";
import type { RealData } from "../domain/verification.ts";
import type { LeetifyClient } from "./leetifyClient.ts";

/** Plazo máximo de una consulta a una fuente real (RNF-5). */
export const SOURCE_TIMEOUT_MS = 8000;

/** Lo que una fuente necesita saber de la cuenta para consultarla. */
export interface RealSourceAccount {
  gameId: GameId;
  /** Identificador visible guardado (Riot ID, SteamID64). */
  handle: string;
  /** Identificador estable de la fuente guardado al verificar (PUUID, SteamID64). */
  externalId: string;
}

/**
 * `unavailable`: la fuente no responde, rechazó la consulta (por ejemplo, clave vencida) o
 * superó su límite de consultas. `gone`: la fuente informa que la cuenta ya no existe.
 */
export type RealResult = { ok: true; data: RealData } | { ok: false; reason: "unavailable" | "gone" };

export interface RealSource {
  /** Fuente que representa; debe coincidir con la que verificó la cuenta. */
  id: SourceId;
  read(account: RealSourceAccount, signal: AbortSignal): Promise<RealResult>;
}

/** Fuente de cada juego; un juego sin fuente registrada no puede resincronizar cuentas verificadas. */
export type SourceRegistry = Partial<Record<GameId, RealSource>>;

const UNAVAILABLE: RealResult = { ok: false, reason: "unavailable" };
const PREMIER_FAILED: LeetifyReading = { kind: "failed" };

/**
 * Ejecuta `run` con plazo (RNF-5; spec 015, RNF-4). Cualquier fallo —excepción o plazo vencido—
 * devuelve `fallback`. El plazo vale aunque `run` ignore la señal de cancelación: la respuesta se
 * corta por su cuenta y la señal se cancela para que `run` suelte sus recursos.
 */
export async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  fallback: T,
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const expired = new Promise<T>((resolve) => {
    controller.signal.addEventListener("abort", () => resolve(fallback), { once: true });
  });
  const result = (async (): Promise<T> => {
    try {
      return await run(controller.signal);
    } catch {
      return fallback;
    }
  })();
  try {
    return await Promise.race([result, expired]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Consulta la fuente con plazo (RNF-5). Cualquier fallo —excepción, rechazo o plazo vencido—
 * es `unavailable` (RF-19).
 */
export function readWithTimeout(
  source: RealSource,
  account: RealSourceAccount,
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<RealResult> {
  return withTimeout((signal) => source.read(account, signal), UNAVAILABLE, timeoutMs);
}

/**
 * Lectura de Leetify con plazo (spec 015, RF-14, RNF-4): plazo vencido, excepción o ausencia de
 * cliente son `failed`. Sin cliente nunca hay red, que es lo que necesitan las pruebas (P15-9).
 */
export function readPremierWithTimeout(
  client: LeetifyClient | undefined,
  steamId: string,
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<LeetifyReading> {
  if (client === undefined) return Promise.resolve(PREMIER_FAILED);
  return withTimeout((signal) => client.readPremier(steamId, signal), PREMIER_FAILED, timeoutMs);
}

const MATCHES_FAILED: LeetifyMatchesReading = { kind: "failed" };

/**
 * Partidas de Leetify con plazo (spec 019, RF-7; spec 015, RNF-4): plazo vencido, excepción,
 * ausencia de cliente o un cliente sin `readRecentMatches` son `failed`, sin red (plan 019, P19-3).
 */
export function readMatchesWithTimeout(
  client: LeetifyClient | undefined,
  steamId: string,
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<LeetifyMatchesReading> {
  const read = client?.readRecentMatches?.bind(client);
  if (read === undefined) return Promise.resolve(MATCHES_FAILED);
  return withTimeout((signal) => read(steamId, signal), MATCHES_FAILED, timeoutMs);
}
