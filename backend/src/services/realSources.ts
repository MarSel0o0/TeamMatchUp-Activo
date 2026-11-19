// Fuentes reales inyectables (spec 012, RF-15, RF-19, RF-20, RF-21, RNF-1, RNF-5; plan, P12-5).
// - Una fuente real (Steam, spec 013; Riot Games, spec 014) se registra por juego y se pasa a
//   `createApp`. Sin fuentes la aplicación funciona igual: las cuentas verificadas responden
//   "no disponible" al resincronizar y las demás no cambian (RF-20).
// - Las pruebas inyectan fuentes falsas y nunca tocan la red (RNF-1).
// - Este módulo no lee `process.env` ni conoce ninguna fuente concreta.
import type { GameId } from "../domain/games.ts";
import type { SourceId } from "../domain/sources.ts";
import type { RealData } from "../domain/verification.ts";

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

/**
 * Consulta la fuente con plazo (RNF-5). Cualquier fallo —excepción, rechazo o plazo vencido—
 * es `unavailable` (RF-19). El plazo vale aunque la fuente ignore la señal de cancelación: la
 * respuesta se corta por su cuenta y la señal se cancela para que la fuente suelte sus recursos.
 */
export async function readWithTimeout(
  source: RealSource,
  account: RealSourceAccount,
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<RealResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const expired = new Promise<RealResult>((resolve) => {
    controller.signal.addEventListener("abort", () => resolve(UNAVAILABLE), { once: true });
  });
  const read = (async (): Promise<RealResult> => {
    try {
      return await source.read(account, controller.signal);
    } catch {
      return UNAVAILABLE;
    }
  })();
  try {
    return await Promise.race([read, expired]);
  } finally {
    clearTimeout(timer);
  }
}
