/**
 * Generador pseudoaleatorio determinista (mulberry32).
 *
 * Los datos de demostración se generan con una semilla fija para que todo el
 * equipo vea exactamente el mismo estado inicial y las capturas de pantalla
 * sean reproducibles.
 */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  const next = (): number => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    int: (min: number, max: number) => Math.floor(next() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (probability: number) => next() < probability,
    /** Elige `count` elementos distintos del arreglo. */
    sample: <T>(items: readonly T[], count: number): T[] => {
      const pool = [...items];
      const picked: T[] = [];
      while (picked.length < count && pool.length > 0) {
        picked.push(...pool.splice(Math.floor(next() * pool.length), 1));
      }
      return picked;
    },
  };
}

export type Random = ReturnType<typeof createRandom>;
