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

export function parseBlock(block: TimeBlock): { day: WeekDay; hour: number } {
  const [day, hour] = block.split('-').map(Number);
  return { day: day as WeekDay, hour };
}

export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function formatBlock(block: TimeBlock): string {
  const { day, hour } = parseBlock(block);
  return `${WEEK_DAYS[day].short} ${formatHour(hour)}`;
}

/** Bloques presentes en ambas disponibilidades. */
export function intersectBlocks(a: TimeBlock[], b: TimeBlock[]): TimeBlock[] {
  const setB = new Set(b);
  return a.filter((block) => setB.has(block));
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
    const { day, hour } = parseBlock(block);
    byDay.set(day, [...(byDay.get(day) ?? []), hour]);
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
