// Transiciones puras del estado de una cuenta de juego (spec 004, RF-4, RF-10, RF-15, RF-28,
// DP-9, DP-11, DP-30, DP-36, RNF-7; plan, sección 6, "Transiciones puras"). El instante
// llega como parámetro; solo importa de domain/ (plan, sección 2.1).
import type { SimulatedMatch, SimulatedReading, Snapshot } from "./rankSimulator.ts";

/** Máximo de partidas guardadas por cuenta (RF-15). */
const MAX_MATCHES = 20;
/** Partidas que entrega el resumen por juego. */
const RECENT_MATCHES = 8;

export interface AccountState {
  currentRank: Snapshot;
  rankHistory: Snapshot[];
  matches: SimulatedMatch[];
  readingNumber: number;
  lastSyncedAt: Date;
  verified: boolean;
}

/** Estado al vincular: lectura número 0 (RF-4). */
export function initialState(reading: SimulatedReading, now: Date): AccountState {
  return {
    currentRank: reading.snapshot,
    rankHistory: [reading.snapshot],
    matches: mergeMatches([], reading.matches, reading.mainMatchId),
    readingNumber: 0,
    lastSyncedAt: now,
    verified: reading.verified,
  };
}

/** Resincronización con la lectura `readingNumber` (RF-10, DP-9, DP-36). No muta `state`. */
export function applySync(
  state: AccountState,
  reading: SimulatedReading,
  readingNumber: number,
  now: Date,
): AccountState {
  return {
    currentRank: reading.snapshot,
    rankHistory: shouldAppendSnapshot(state.currentRank, reading.snapshot)
      ? [...state.rankHistory, reading.snapshot]
      : state.rankHistory,
    matches: mergeMatches(state.matches, reading.matches, reading.mainMatchId),
    readingNumber,
    lastSyncedAt: now,
    verified: reading.verified,
  };
}

/** Se agrega fotografía solo si cambió tier, división o puntos (DP-9). */
export function shouldAppendSnapshot(previous: Snapshot, next: Snapshot): boolean {
  return previous.tier !== next.tier || previous.division !== next.division || previous.points !== next.points;
}

/**
 * Compara dos textos por puntos de código Unicode (no por unidades UTF-16): el primer código
 * distinto decide y, si uno es prefijo del otro, el más corto va antes.
 */
export function compareCodePoints(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const ca = a.codePointAt(i) ?? 0;
    const cb = b.codePointAt(j) ?? 0;
    if (ca !== cb) return ca < cb ? -1 : 1;
    i += ca > 0xffff ? 2 : 1;
    j += cb > 0xffff ? 2 : 1;
  }
  if (i < a.length) return 1;
  if (j < b.length) return -1;
  return 0;
}

/**
 * Orden de RF-28: más reciente primero; a igual fecha, identificador mayor primero según
 * `compareCodePoints`.
 */
export function compareMatches(a: SimulatedMatch, b: SimulatedMatch): number {
  const byDate = b.playedAt.getTime() - a.playedAt.getTime();
  if (byDate !== 0) return byDate;
  return compareCodePoints(b.id, a.id);
}

/**
 * Unión de partidas (RF-15, RF-28): sin repetidos (se conserva la guardada), en el orden de
 * `compareMatches` y con 20 como máximo; la partida principal siempre queda entre ellas.
 */
export function mergeMatches(
  saved: SimulatedMatch[],
  incoming: SimulatedMatch[],
  mainMatchId: string,
): SimulatedMatch[] {
  const savedIds = new Set(saved.map((m) => m.id));
  const all = [...saved, ...incoming.filter((m) => !savedIds.has(m.id))].sort(compareMatches);
  const first = all.slice(0, MAX_MATCHES);
  const main = all.find((m) => m.id === mainMatchId);
  if (main === undefined || first.includes(main)) return first;
  const others = all.filter((m) => m !== main).slice(0, MAX_MATCHES - 1);
  return [main, ...others].sort(compareMatches);
}

/** Porcentaje de victorias redondeado, mitades hacia arriba (DP-11); 0 si no hay partidas. */
export function winRate(matches: readonly { result: "win" | "loss" }[]): number {
  if (matches.length === 0) return 0;
  const wins = matches.filter((m) => m.result === "win").length;
  return Math.round((wins * 100) / matches.length);
}

/** Normalizado vigente menos el del primer elemento del historial (DP-30); 0 si está vacío. */
export function trend(current: Snapshot, history: readonly Snapshot[]): number {
  const first = history[0];
  return first === undefined ? 0 : current.normalized - first.normalized;
}

/** Las 8 primeras partidas en el orden guardado (RF-28). */
export function recentMatches(matches: SimulatedMatch[]): SimulatedMatch[] {
  return matches.slice(0, RECENT_MATCHES);
}
