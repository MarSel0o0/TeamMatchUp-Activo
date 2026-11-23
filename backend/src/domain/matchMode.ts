// Modo de una partida de LoL y sus reglas (spec 020, RF-2, RF-3, RF-4, RF-5, RF-16; plan, §2.1).
// Dominio puro: sin Express, Mongoose, red ni reloj.
import type { Origin } from "./sources.ts";

/** Modos de partida, en el orden fijo de las pestañas de la ficha (RF-5). */
export const MATCH_MODES = ["solo", "flex", "normal", "aram", "other"] as const;

export type MatchMode = (typeof MATCH_MODES)[number];

/**
 * Colas de Match-v5 con modo propio (spec 020, Definiciones; D7): Solo/Dúo (420), Flex (440), normales (400
 * con selección, 430 a ciegas y 490 partida rápida) y ARAM (450). Clash, Arena, URF, eventos y partidas
 * personalizadas no están: son `other`.
 */
const QUEUE_MODES: ReadonlyMap<number, MatchMode> = new Map<number, MatchMode>([
  [420, "solo"],
  [440, "flex"],
  [400, "normal"],
  [430, "normal"],
  [490, "normal"],
  [450, "aram"],
]);

/**
 * Modo de partida según la cola que informa Riot (RF-2, RF-4): `undefined` (la partida no informa su cola)
 * y cualquier cola desconocida son `other`.
 */
export function modeOfQueue(queueId: number | undefined): MatchMode {
  if (queueId === undefined) return "other";
  return QUEUE_MODES.get(queueId) ?? "other";
}

/** Modo con el que se lee una partida guardada: las guardadas antes de la spec 020 no tienen modo y eran `solo` (RF-3). */
export function storedMode(mode: MatchMode | undefined): MatchMode {
  return mode ?? "solo";
}

/** Solo las partidas con origen Riot Games tienen modos de partida reales (RF-5, RF-16). */
export function hasMatchModes(origin: Origin): boolean {
  return origin === "riot";
}
