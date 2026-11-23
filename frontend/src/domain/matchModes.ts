import type { MatchMode, MatchRecord, Origin } from './types';

/**
 * Reglas puras de las pestañas de partidas por modo de la ficha de LoL (spec 020, RF-5, RF-7, RF-10, RF-16, RF-17;
 * plan, §2.2). Sin React, sin HTTP y sin reloj. Las partidas llegan ordenadas de la más reciente a la más antigua
 * (spec 004, RF-28) y estas reglas conservan ese orden.
 */

/** Modos en el orden fijo de las pestañas (RF-5). */
export const MATCH_MODE_ORDER: readonly MatchMode[] = ['solo', 'flex', 'normal', 'aram', 'other'];

/** Pestaña de las partidas: «Todas» o un modo. */
export type MatchTab = 'all' | MatchMode;

/** Partidas que enseña cada pestaña como máximo (RF-7, D1). */
export const MATCHES_PER_TAB = 8;

/** Las pestañas solo existen para partidas con origen Riot y al menos una (RF-5, RF-16, RF-17). */
export function showModeTabs(origin: Origin, matches: readonly MatchRecord[]): boolean {
  return origin === 'riot' && matches.length > 0;
}

/** Modo de una partida; las que no lo traen eran de Solo/Dúo, como en el servidor (RF-3). */
export function modeOf(match: MatchRecord): MatchMode {
  return match.mode ?? 'solo';
}

/** «Todas» y, en el orden fijo, los modos con al menos una partida (RF-5). */
export function availableTabs(matches: readonly MatchRecord[]): MatchTab[] {
  const present = new Set(matches.map(modeOf));
  return ['all', ...MATCH_MODE_ORDER.filter((mode) => present.has(mode))];
}

/** Las partidas de una pestaña: hasta 8, las más recientes de su modo («Todas»: de cualquiera) (RF-7). */
export function matchesForTab(matches: readonly MatchRecord[], tab: MatchTab): MatchRecord[] {
  const inTab = tab === 'all' ? matches : matches.filter((match) => modeOf(match) === tab);
  return inTab.slice(0, MATCHES_PER_TAB);
}

/** La pestaña elegida si sigue disponible; si no, «Todas» (RF-10). */
export function resolveTab(selected: MatchTab, available: readonly MatchTab[]): MatchTab {
  return available.includes(selected) ? selected : 'all';
}
