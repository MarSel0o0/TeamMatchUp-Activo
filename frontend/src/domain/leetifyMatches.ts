import type { LeetifyOutcome, Origin } from './types';

/**
 * Partidas de CS2 que entrega Leetify (spec 019, RF-2, RF-3, RF-4, RF-11). Funciones puras: el
 * servidor ya filtra, ordena y recorta la lista; aquí solo se rotula, sin recalcular nada.
 */

const OUTCOME_LABELS: Readonly<Record<LeetifyOutcome, string>> = {
  win: 'Victoria',
  loss: 'Derrota',
  tie: 'Empate',
};

/** Resultado de la partida en palabras (RF-3). */
export function outcomeLabel(outcome: LeetifyOutcome): string {
  return OUTCOME_LABELS[outcome];
}

/** Marcador en el orden que lo entrega Leetify (RF-3; pautas de Leetify, §5). */
export function scoreLabel(score: readonly [number, number]): string {
  return `${score[0]} – ${score[1]}`;
}

/**
 * ¿El bloque de partidas se pide en vivo a Leetify? Solo con origen Leetify, que el servidor da a
 * las cuentas de CS2 verificadas con Steam; nunca en cuentas sin verificar ni en el modo simulado
 * (RF-2, RF-11). En ese caso tampoco se muestra la tasa de victorias (RF-4).
 */
export function showsLeetifyMatches(matchesOrigin: Origin): boolean {
  return matchesOrigin === 'leetify';
}
