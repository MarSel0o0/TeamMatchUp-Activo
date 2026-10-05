import { GRID_HOURS } from '@/domain/availability';
import type { PlaySession } from '@/domain/types';

export interface PositionedSession {
  session: PlaySession;
  /** Fila de inicio dentro de `GRID_HOURS`. */
  rowIndex: number;
  /** Cantidad de filas que ocupa. */
  span: number;
  /** Columna asignada dentro de su grupo de sesiones solapadas. */
  column: number;
  /** Total de columnas del grupo: define el ancho de cada sesión. */
  columns: number;
}

/**
 * Reparte las sesiones de un día en columnas.
 *
 * Dos sesiones que se pisan en el tiempo no pueden dibujarse una encima de la
 * otra, así que se agrupan los solapes y dentro de cada grupo se reparte el
 * ancho de la columna del día, como en un calendario tradicional.
 */
export function layoutDay(sessions: PlaySession[]): PositionedSession[] {
  const items = sessions
    .map((session) => {
      const rowIndex = GRID_HOURS.indexOf(session.startHour);
      if (rowIndex < 0) return null;
      const span = Math.min(session.durationHours, GRID_HOURS.length - rowIndex);
      return { session, rowIndex, span, start: rowIndex, end: rowIndex + span };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => a.start - b.start || b.span - a.span);

  const positioned: PositionedSession[] = [];
  let group: typeof items = [];
  let groupEnd = -1;

  /** Asigna columnas a un grupo de sesiones que se solapan entre sí. */
  const flush = () => {
    if (group.length === 0) return;

    // `columnEnds[i]` es la fila en que queda libre la columna `i`.
    const columnEnds: number[] = [];
    const assignments = group.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column < 0) column = columnEnds.length;
      columnEnds[column] = item.end;
      return { item, column };
    });

    for (const { item, column } of assignments) {
      positioned.push({
        session: item.session,
        rowIndex: item.rowIndex,
        span: item.span,
        column,
        columns: columnEnds.length,
      });
    }
    group = [];
    groupEnd = -1;
  };

  for (const item of items) {
    if (group.length > 0 && item.start >= groupEnd) flush();
    group.push(item);
    groupEnd = Math.max(groupEnd, item.end);
  }
  flush();

  return positioned;
}

/** Posiciona todas las sesiones de la semana, día por día. */
export function layoutWeek(sessions: PlaySession[]): (PositionedSession & { day: number })[] {
  const byDay = new Map<number, PlaySession[]>();
  for (const session of sessions) {
    byDay.set(session.day, [...(byDay.get(session.day) ?? []), session]);
  }

  return [...byDay.entries()].flatMap(([day, daySessions]) =>
    layoutDay(daySessions).map((item) => ({ ...item, day })),
  );
}
