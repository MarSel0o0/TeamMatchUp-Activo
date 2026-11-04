// Bloques horarios en común (spec 005, RF-3 bloques, DP5-9, RNF-1; plan, secciones 2 y 3.2).
// Reglas puras: sin Express, Mongoose, red ni reloj.

// "<día>-<hora>": día 0..6, hora 0..23, sin ceros a la izquierda, signos ni espacios.
// Sin la bandera `m`, `$` solo coincide al final del texto: "2-20\n" no es un bloque.
const BLOCK_PATTERN = /^([0-6])-([0-9]|1[0-9]|2[0-3])$/;

export interface ParsedBlock {
  day: number;
  hour: number;
}

/** Día y hora de un bloque `"<día>-<hora>"`, o `null` si el texto no cumple el formato. */
export function parseBlock(block: string): ParsedBlock | null {
  const match = BLOCK_PATTERN.exec(block);
  if (match === null) return null;
  const [, day, hour] = match;
  if (day === undefined || hour === undefined) return null;
  return { day: Number(day), hour: Number(hour) };
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
