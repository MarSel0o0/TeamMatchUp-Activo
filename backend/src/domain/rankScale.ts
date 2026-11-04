// Escala de rango, normalización y bandas de puntos (spec 004, RF-36, DP-2, DP-26, DP-34;
// plan, sección 3). Funciones puras: sin reloj, Express ni Mongoose.
import { GAMES } from "./games.ts";
import type { GameId } from "./games.ts";

/** Un escalón: cada división de un tier con divisiones, o el tier entero si no las tiene. */
export interface RankStep {
  tier: string;
  division?: string;
}

/** Cuántos de los primeros tiers de cada juego tienen divisiones (DP-26). */
const TIERS_WITH_DIVISIONS: Readonly<Record<GameId, number>> = { lol: 7, r6: 7, cs2: 0 };

function buildLadder(gameId: GameId): readonly RankStep[] {
  const { tiers, divisions } = GAMES[gameId];
  const steps: RankStep[] = [];
  tiers.forEach((tier, tierIndex) => {
    if (tierIndex < TIERS_WITH_DIVISIONS[gameId]) {
      for (const division of divisions) steps.push({ tier, division });
    } else {
      steps.push({ tier });
    }
  });
  return steps;
}

const LADDERS: Readonly<Record<GameId, readonly RankStep[]>> = {
  lol: buildLadder("lol"),
  r6: buildLadder("r6"),
  cs2: buildLadder("cs2"),
};

/** Escalones de menor a mayor: LoL 31, CS2 7, R6 36. */
export function ladder(gameId: GameId): readonly RankStep[] {
  return LADDERS[gameId];
}

/**
 * Posición del escalón. `null` si el tier no está en la escala. En un tier con divisiones,
 * una división ausente o desconocida cuenta como la más baja; en un tier sin divisiones, la
 * división se ignora (DP-26).
 */
export function stepIndexOf(gameId: GameId, tier: string, division?: string): number | null {
  const first = LADDERS[gameId].findIndex((step) => step.tier === tier);
  if (first < 0) return null;
  const firstStep = LADDERS[gameId][first];
  if (firstStep?.division === undefined) return first;
  const offset = division === undefined ? -1 : GAMES[gameId].divisions.indexOf(division);
  return first + Math.max(0, offset);
}

function assertStep(gameId: GameId, stepIndex: number): void {
  const size = LADDERS[gameId].length;
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= size) {
    throw new RangeError(`escalón fuera de la escala de ${gameId}: ${stepIndex}`);
  }
}

/** `round(paso * 100 / (tamaño − 1))`; el producto va antes de la división. */
export function normalizeStep(gameId: GameId, stepIndex: number): number {
  assertStep(gameId, stepIndex);
  return Math.round((stepIndex * 100) / (LADDERS[gameId].length - 1));
}

/** Valor normalizado 0–100 de un tier y división; tier inexistente = 0. */
export function normalizeRank(gameId: GameId, tier: string, division?: string): number {
  const stepIndex = stepIndexOf(gameId, tier, division);
  return stepIndex === null ? 0 : normalizeStep(gameId, stepIndex);
}

/**
 * Banda cerrada de puntos del escalón (DP-34): LoL 0–99 con división y 0–999 en Master+;
 * CS2 de 5000 en 5000 y Gold 30000–34999; R6 de 100 en 100 desde 1000 y Champion 4500–4999.
 */
export function pointsBand(gameId: GameId, stepIndex: number): { min: number; max: number } {
  assertStep(gameId, stepIndex);
  const top = stepIndex === LADDERS[gameId].length - 1;
  switch (gameId) {
    case "lol":
      return stepIndex < 28 ? { min: 0, max: 99 } : { min: 0, max: 999 };
    case "cs2":
      return top ? { min: 30000, max: 34999 } : { min: 5000 * stepIndex, max: 5000 * stepIndex + 4999 };
    case "r6":
      return top ? { min: 4500, max: 4999 } : { min: 1000 + 100 * stepIndex, max: 1000 + 100 * stepIndex + 99 };
  }
}
