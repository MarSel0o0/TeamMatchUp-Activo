// Transiciones puras de una cuenta que pasa a datos reales (spec 012, RF-8, RF-9, RF-15; plan,
// sección 2). El instante llega como parámetro; solo importa de domain/. No muta sus entradas.
// - `verifiedState`: al verificar, los bloques que la fuente entrega reemplazan a los
//   simulados; el resto queda como estaba y sigue etiquetado como simulado (RF-8).
// - `applyRealSync`: al resincronizar, el historial solo crece si cambia el rango (RF-9).
import { mergeMatches, shouldAppendSnapshot } from "./accountState.ts";
import type { AccountState } from "./accountState.ts";
import type { SimulatedMatch, Snapshot } from "./rankSimulator.ts";

/** Una partida tal como la guarda la cuenta; la entregue el simulador o una fuente real. */
export type RealMatch = SimulatedMatch;

/** Datos de perfil que puede traer una fuente (cada una trae los suyos). */
export interface RealProfile {
  displayName?: string;
  avatarUrl?: string;
  country?: string;
  level?: number;
  iconId?: number;
  hoursTotal?: number;
  hoursRecent?: number;
  isPrivate?: boolean;
}

/**
 * Lo que una fuente real entrega de una cuenta. Todo es opcional salvo el identificador visible:
 * un bloque ausente significa "esta fuente no lo entrega" (Steam no trae rango ni partidas).
 */
export interface RealData {
  /** Identificador visible vigente (Riot ID, SteamID64). */
  handle: string;
  rank?: Snapshot;
  matches?: RealMatch[];
  /** Partida que debe conservarse siempre entre las 20 guardadas, si la fuente la indica. */
  mainMatchId?: string;
  profile?: RealProfile;
}

/**
 * Estado de una cuenta recién verificada. `base` es el estado simulado de la cuenta propia que
 * se convierte, o la lectura simulada número 0 si no tenía cuenta (RF-13). Si la fuente entrega
 * rango, el historial empieza con ese único punto real y se descarta el simulado (RF-8, RF-9);
 * si entrega partidas, reemplazan a las simuladas. Lo que no entrega queda como en `base`.
 */
export function verifiedState(base: AccountState, real: RealData, now: Date): AccountState {
  return {
    currentRank: real.rank ?? base.currentRank,
    rankHistory: real.rank === undefined ? base.rankHistory : [real.rank],
    matches: real.matches === undefined ? base.matches : mergeMatches([], real.matches, real.mainMatchId ?? ""),
    readingNumber: base.readingNumber,
    lastSyncedAt: now,
  };
}

/**
 * Resincronización de una cuenta verificada (RF-15). El rango vigente toma siempre la lectura
 * nueva; el historial agrega un punto solo si cambió tier, división o puntos (RF-9, igual que
 * `shouldAppendSnapshot` de la spec 004, DP-9). Las partidas se unen sin repetidos conservando
 * la guardada (RF-15 de la 004). Los bloques que la fuente no entrega no cambian.
 */
export function applyRealSync(state: AccountState, real: RealData, now: Date): AccountState {
  const rank = real.rank;
  return {
    currentRank: rank ?? state.currentRank,
    rankHistory:
      rank !== undefined && shouldAppendSnapshot(state.currentRank, rank)
        ? [...state.rankHistory, rank]
        : state.rankHistory,
    matches:
      real.matches === undefined ? state.matches : mergeMatches(state.matches, real.matches, real.mainMatchId ?? ""),
    readingNumber: state.readingNumber,
    lastSyncedAt: now,
  };
}
