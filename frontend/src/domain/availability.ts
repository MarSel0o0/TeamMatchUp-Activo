import type { TimeBlock, WeekDay } from './types';

export const WEEK_DAYS: { value: WeekDay; label: string; short: string }[] = [
  { value: 0, label: 'Lunes', short: 'Lun' },
  { value: 1, label: 'Martes', short: 'Mar' },
  { value: 2, label: 'Miércoles', short: 'Mié' },
  { value: 3, label: 'Jueves', short: 'Jue' },
  { value: 4, label: 'Viernes', short: 'Vie' },
  { value: 5, label: 'Sábado', short: 'Sáb' },
  { value: 6, label: 'Domingo', short: 'Dom' },
];

/**
 * Horas que dibuja la hoja.
 *
 * No son las 24: nadie coordina una partida competitiva a las nueve de la
 * mañana, y esas filas vacías se comen la mitad de la reja. Se abre a las 12:00
 * —que cubre las tardes de fin de semana— y se cierra a las 02:00.
 */
export const GRID_HOURS: number[] = [
  ...Array.from({ length: 12 }, (_, index) => index + 12), // 12:00 - 23:00
  0,
  1,
];

export function toBlock(day: WeekDay, hour: number): TimeBlock {
  return `${day}-${hour}`;
}

// "<día>-<hora>": día 0..6, hora 0..23, sin ceros a la izquierda, signos ni espacios.
// Sin la bandera `m`, `$` solo coincide al final del texto: "2-20\n" no es un bloque.
// Mismo criterio que `backend/src/domain/availability.ts` (spec 005, DP5-9).
const BLOCK_PATTERN = /^([0-6])-([0-9]|1[0-9]|2[0-3])$/;

/** Día y hora de un bloque `"<día>-<hora>"`, o `null` si el texto no cumple el formato. */
export function parseBlock(block: string): { day: WeekDay; hour: number } | null {
  const match = BLOCK_PATTERN.exec(block);
  if (match === null) return null;
  const [, day, hour] = match;
  if (day === undefined || hour === undefined) return null;
  return { day: Number(day) as WeekDay, hour: Number(hour) };
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatBlock(block: TimeBlock): string {
  const parsed = parseBlock(block);
  if (parsed === null) return block;
  return `${WEEK_DAYS[parsed.day].short} ${formatHour(parsed.hour)}`;
}

/**
 * Orden numérico por día y, dentro del día, por hora (`0-5` antes que `0-23`). Solo
 * compara bloques válidos: un texto que no lo sea se trata como el menor (no se espera,
 * `intersectBlocks` los descarta antes de ordenar).
 */
export function compareBlocks(a: string, b: string): number {
  const first = parseBlock(a);
  const second = parseBlock(b);
  if (first === null || second === null) {
    if (first === null && second === null) return 0;
    return first === null ? -1 : 1;
  }
  return first.day - second.day || first.hour - second.hour;
}

/**
 * Bloques presentes en ambas listas: solo bloques válidos, sin repetidos, ordenados por
 * día y hora. No modifica las entradas.
 */
export function intersectBlocks(a: readonly string[], b: readonly string[]): string[] {
  const inB = new Set(b.filter((block) => parseBlock(block) !== null));
  const common = new Set(a.filter((block) => inB.has(block) && parseBlock(block) !== null));
  return [...common].sort(compareBlocks);
}

/**
 * Agrupa bloques sueltos en tramos contiguos por día para poder mostrarlos
 * como `Mié 20:00 - 23:00` en vez de tres etiquetas separadas.
 */
export interface BlockRange {
  day: WeekDay;
  startHour: number;
  endHour: number;
}

export function groupBlocks(blocks: TimeBlock[]): BlockRange[] {
  const byDay = new Map<WeekDay, number[]>();
  for (const block of blocks) {
    const parsed = parseBlock(block);
    if (parsed === null) continue;
    byDay.set(parsed.day, [...(byDay.get(parsed.day) ?? []), parsed.hour]);
  }

  const ranges: BlockRange[] = [];
  for (const [day, hours] of [...byDay.entries()].sort((a, b) => a[0] - b[0])) {
    const sorted = [...hours].sort((a, b) => a - b);
    let start = sorted[0];
    let previous = sorted[0];

    for (const hour of sorted.slice(1)) {
      if (hour !== previous + 1) {
        ranges.push({ day, startHour: start, endHour: previous + 1 });
        start = hour;
      }
      previous = hour;
    }
    ranges.push({ day, startHour: start, endHour: previous + 1 });
  }
  return ranges;
}

export function formatRange(range: BlockRange): string {
  return `${WEEK_DAYS[range.day].short} ${formatHour(range.startHour)}–${formatHour(
    range.endHour % 24,
  )}`;
}
