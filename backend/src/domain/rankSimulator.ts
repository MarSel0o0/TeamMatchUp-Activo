// Proveedor simulado puro (spec 004, RF-34, RF-35, RF-36, RF-41, RF-42, RF-43, RNF-7;
// plan, sección 4). Todo depende solo de (juego, identificador canónico, número de lectura);
// el instante llega como parámetro y solo fija las fechas. Sin reloj, azar, Express ni Mongoose.
import type { GameId } from "./games.ts";
import { ladder, normalizeStep, pointsBand } from "./rankScale.ts";

export interface SimulatedMatch {
  id: string;
  gameId: GameId;
  playedAt: Date;
  result: "win" | "loss";
  summary: string;
  durationMinutes: number;
  rankDelta: number;
}

export interface Snapshot {
  tier: string;
  division?: string;
  points: number;
  normalized: number;
  recordedAt: Date;
}

export interface SimulatedReading {
  snapshot: Snapshot;
  matches: SimulatedMatch[];
  mainMatchId: string;
  verified: boolean;
}

export interface ReadingInput {
  gameId: GameId;
  canonicalHandle: string;
  readingNumber: number;
  now: Date;
}

/** FNV-1a de 32 bits sobre unidades UTF-16. */
export function hash32(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Generador mulberry32: valores en [0, 1). */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, list: readonly T[]): T {
  const value = list[randInt(rng, 0, list.length - 1)];
  if (value === undefined) throw new RangeError("lista vacía");
  return value;
}

export function canonicalHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

/** Generador de la lectura k (plan, 4.1). */
function readingRng(gameId: GameId, canonical: string, k: number): () => number {
  return createRng(hash32(`${gameId}|${canonical}|${k}`));
}

/** Verificada si la suma de los códigos del identificador canónico es par (plan, 4.4). */
export function isVerified(canonical: string): boolean {
  let sum = 0;
  for (let i = 0; i < canonical.length; i += 1) sum += canonical.charCodeAt(i);
  return sum % 2 === 0;
}

export function evolveStep(previous: number, delta: -1 | 0 | 1, size: number): number {
  return Math.min(size - 1, Math.max(0, previous + delta));
}

function toDelta(value: number): -1 | 0 | 1 {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

/** Escalón de la lectura n (plan, 4.2): uniforme en la lectura 0 y ±1 en cada siguiente. */
export function stepAt(gameId: GameId, canonical: string, readingNumber: number): number {
  const size = ladder(gameId).length;
  let step = randInt(readingRng(gameId, canonical, 0), 0, size - 1);
  for (let k = 1; k <= readingNumber; k += 1) {
    const delta = toDelta(randInt(readingRng(gameId, canonical, k), -1, 1));
    step = evolveStep(step, delta, size);
  }
  return step;
}

const DURATION: Readonly<Record<GameId, { min: number; max: number }>> = {
  lol: { min: 20, max: 45 },
  r6: { min: 15, max: 40 },
  cs2: { min: 25, max: 50 },
};

const DELTA: Readonly<Record<GameId, { min: number; max: number }>> = {
  lol: { min: 12, max: 25 },
  r6: { min: 15, max: 35 },
  cs2: { min: 50, max: 300 },
};

const CHAMPIONS = ["Ahri", "Jinx", "Thresh", "Lee Sin", "Lux", "Ezreal", "Leona", "Yasuo"] as const;
const OPERATORS = ["Ash", "Thermite", "Sledge", "Mute", "Valkyrie", "Thatcher", "Smoke", "Doc"] as const;
const MAPS = ["Mirage", "Inferno", "Nuke", "Ancient", "Anubis", "Dust II", "Train"] as const;
const SEPARATOR = " · ";

function summaryFor(gameId: GameId, rng: () => number, result: "win" | "loss"): string {
  switch (gameId) {
    case "lol": {
      const champion = pick(rng, CHAMPIONS);
      const kills = randInt(rng, 0, 15);
      const deaths = randInt(rng, 0, 12);
      const assists = randInt(rng, 0, 20);
      return `${champion}${SEPARATOR}${kills}/${deaths}/${assists}`;
    }
    case "r6": {
      const operator = pick(rng, OPERATORS);
      const kills = randInt(rng, 0, 12);
      return `${operator}${SEPARATOR}${kills} bajas`;
    }
    case "cs2": {
      const map = pick(rng, MAPS);
      const rounds = randInt(rng, 0, 11);
      return result === "win" ? `${map}${SEPARATOR}13-${rounds}` : `${map}${SEPARATOR}${rounds}-13`;
    }
  }
}

/**
 * Lectura completa (plan, 4.3). El orden de consumo del generador es contrato:
 * (descartado), puntos, número de partidas y, por partida, [edad si j > 0], resultado,
 * duración, magnitud y campos del resumen.
 */
export function simulateReading(input: ReadingInput): SimulatedReading {
  const { gameId, canonicalHandle: canonical, readingNumber: n, now } = input;
  const rng = readingRng(gameId, canonical, n);
  rng(); // el primer valor ya lo usa stepAt

  const step = stepAt(gameId, canonical, n);
  const ladderStep = ladder(gameId)[step];
  if (ladderStep === undefined) throw new RangeError(`escalón fuera de la escala de ${gameId}: ${step}`);
  const range = pointsBand(gameId, step);
  const points = randInt(rng, range.min, range.max);
  const snapshot: Snapshot = {
    tier: ladderStep.tier,
    ...(ladderStep.division === undefined ? {} : { division: ladderStep.division }),
    points,
    normalized: normalizeStep(gameId, step),
    recordedAt: new Date(now.getTime()),
  };

  const count = randInt(rng, 1, 8);
  const matches: SimulatedMatch[] = [];
  let ageMinutes = 0;
  for (let j = 0; j < count; j += 1) {
    if (j > 0) ageMinutes += randInt(rng, 20, 180);
    const result = rng() < 0.5 ? "win" : "loss";
    const durationMinutes = randInt(rng, DURATION[gameId].min, DURATION[gameId].max);
    const magnitude = randInt(rng, DELTA[gameId].min, DELTA[gameId].max);
    const summary = summaryFor(gameId, rng, result);
    matches.push({
      id: `m-${n}-${j}`,
      gameId,
      playedAt: new Date(now.getTime() - ageMinutes * 60_000),
      result,
      summary,
      durationMinutes,
      rankDelta: result === "win" ? magnitude : -magnitude,
    });
  }

  return { snapshot, matches, mainMatchId: `m-${n}-0`, verified: isVerified(canonical) };
}
