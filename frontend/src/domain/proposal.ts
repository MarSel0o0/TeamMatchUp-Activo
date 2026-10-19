import { GRID_HOURS, compareBlocks, intersectBlocks, parseBlock } from './availability';
import type { GameId, WeekDay } from './types';

/**
 * Reglas de "Proponer sesión" (spec 007, RF-29). Dominio puro: sin React, sin HTTP y sin
 * reloj. La agenda y la ficha de jugador (spec 008) las importan, no las repiten.
 *
 * Los bloques se comparan tal como cada jugador los guardó, sin convertir zonas horarias.
 */

/** Por qué "Proponer" queda deshabilitado; el texto de cada motivo vive en `copy.ts`. */
export type BlockReason = 'noOwnHours' | 'noTheirHours' | 'noCommon' | 'outsideAgenda';

/** Serie de horas seguidas del mismo día; `endHour` es la última hora incluida. */
export interface BlockRun {
  day: WeekDay;
  startHour: number;
  endHour: number;
}

export interface Proposal {
  gameId: GameId;
  day: WeekDay;
  startHour: number;
  durationHours: number;
  title: string;
  slots: number;
  notes: string;
}

/** Cupos y notas con los que arranca el formulario de nueva sesión. */
export const PROPOSAL_DEFAULTS = { slots: 5, notes: '' } as const;

const MIN_DURATION_HOURS = 1;
const MAX_DURATION_HOURS = 4;

/**
 * Series de horas seguidas del mismo día. Una serie no pasa de un día al siguiente: el
 * domingo 23:00 y el lunes 00:00 son dos series. Solo cuenta los bloques válidos, sin
 * repetidos; ordena por día (0..6) y por hora (0..23). No modifica la entrada.
 */
export function sharedRuns(shared: readonly string[]): BlockRun[] {
  const blocks = intersectBlocks(shared, shared);
  const runs: BlockRun[] = [];
  for (const block of blocks) {
    const parsed = parseBlock(block);
    if (parsed === null) continue;
    const last = runs[runs.length - 1];
    if (last !== undefined && last.day === parsed.day && parsed.hour === last.endHour + 1) {
      last.endHour = parsed.hour;
    } else {
      runs.push({ day: parsed.day, startHour: parsed.hour, endHour: parsed.hour });
    }
  }
  return runs;
}

/** Primero que aplique de: sin horas propias, sin horas del otro, sin cruce, fuera de agenda. */
export function blockReason(
  mine: readonly string[],
  theirs: readonly string[],
): BlockReason | null {
  if (mine.length === 0) return 'noOwnHours';
  if (theirs.length === 0) return 'noTheirHours';
  const shared = intersectBlocks(mine, theirs);
  if (shared.length === 0) return 'noCommon';
  if (firstAgendaBlock(shared) === null) return 'outsideAgenda';
  return null;
}

export function proposalTitle(displayName: string): string {
  return `Sesión con ${displayName}`;
}

/**
 * Propuesta de sesión para un candidato, o `null` si hay un motivo de bloqueo: el primer
 * bloque en común con hora en el horario de la agenda (día asc, hora asc literal), con una
 * duración de 1 a 4 horas hasta el final de su serie.
 */
export function buildProposal(input: {
  gameId: GameId;
  displayName: string;
  mine: readonly string[];
  theirs: readonly string[];
}): Proposal | null {
  if (blockReason(input.mine, input.theirs) !== null) return null;
  const shared = intersectBlocks(input.mine, input.theirs);
  const first = firstAgendaBlock(shared);
  if (first === null) return null;
  const run = sharedRuns(shared).find(
    (candidate) =>
      candidate.day === first.day &&
      candidate.startHour <= first.hour &&
      first.hour <= candidate.endHour,
  );
  if (run === undefined) return null;
  const durationHours = Math.min(
    MAX_DURATION_HOURS,
    Math.max(MIN_DURATION_HOURS, run.endHour - first.hour + 1),
  );
  return {
    gameId: input.gameId,
    day: first.day,
    startHour: first.hour,
    durationHours,
    title: proposalTitle(input.displayName),
    ...PROPOSAL_DEFAULTS,
  };
}

/** Primer bloque (orden `compareBlocks`) cuya hora dibuja la agenda. */
function firstAgendaBlock(shared: readonly string[]): { day: WeekDay; hour: number } | null {
  const ordered = [...shared].sort(compareBlocks);
  for (const block of ordered) {
    const parsed = parseBlock(block);
    if (parsed !== null && GRID_HOURS.includes(parsed.hour)) return parsed;
  }
  return null;
}
