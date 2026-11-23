// Rango Premier real de CS2 desde Leetify (spec 015, RF-2 a RF-5, RF-9, RF-11, RF-14, RF-18,
// RNF-5; plan, secciones 1, 3 y 4.1). Funciones puras: sin Express, Mongoose, red ni reloj
// («hoy» llega como parámetro) y sin importar nada fuera de `domain/`.
// - Una lectura de Leetify termina de una de tres formas (Definiciones): con rango, sin rango
//   Premier o fallo. Nunca se guarda un dato dudoso: lo que no encaja en RF-2 es fallo (D13).
// - Del perfil se lee `ranks.premier` (spec 015) y, desde la spec 019, `recent_matches` (RNF-3).
import { GAMES } from "./games.ts";
import { normalizeStep } from "./rankScale.ts";
import type { Snapshot } from "./rankSimulator.ts";

/** Resultado de una lectura de Leetify (RF-2, RF-14). */
export type LeetifyReading =
  | { kind: "rated"; rating: number }
  | { kind: "unrated" }
  | { kind: "failed" };

/** Estado del rango Premier de una cuenta de CS2 verificada con Steam (plan, sección 1). */
export type PremierStatus = "rated" | "unrated" | "unavailable";

export interface PremierState {
  premier: PremierStatus;
  /** `null` salvo con rating: «sin rango Premier» y «rango no disponible» no tienen rango. */
  currentRank: Snapshot | null;
  rankHistory: Snapshot[];
}

/** Rating Premier más alto que se acepta: por encima es una respuesta inválida (RF-2, RF-14). */
const MAX_RATING = 99999;
/** Ancho de cada escalón de la escala de CS2 para datos reales (spec 015, Definiciones). */
const STEP_WIDTH = 5000;

/** Avisos que ve el usuario (RF-15, RF-16). Empiezan por el nombre propio Leetify (RNF-5). */
export const LEETIFY_NOTICES = {
  /** RF-15: al verificar, bajo «cuenta de Steam verificada». */
  verifyFailed: "Leetify no responde: tu rango Premier se obtendrá al resincronizar",
  /** RF-16: al resincronizar, en la fila de la cuenta. */
  syncFailed: "Leetify no está disponible por ahora: tu rango Premier no se actualizó",
} as const;

/** Errores de Coincidencias de CS2 cuando la cuenta propia no tiene rango (RF-10, D22). */
export const LEETIFY_ERRORS = {
  noPremierForMatches: "tu cuenta de CS2 no tiene rango Premier: resincronízala cuando lo tengas en Leetify",
  premierUnavailableForMatches: "tu cuenta de CS2 tiene el rango no disponible: resincronízala",
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Clasifica la respuesta de `GET /v3/profile` (RF-2, RF-14; D10, D12, D13, D24). `body` es el JSON
 * ya leído, o `undefined` si no había uno legible.
 * - 404: Leetify no tiene perfil de ese SteamID64 → sin rango Premier (P15-3).
 * - Cualquier otro estado distinto de 200 (clave rechazada, límite superado, caída) → fallo.
 * - `ranks.premier` entero de 1 a 99999 → con rango; 0, nulo o ausente → sin rango Premier;
 *   cualquier otra cosa (negativo, decimal, mayor, texto, forma ajena) → fallo.
 */
export function parseLeetifyProfile(status: number, body: unknown): LeetifyReading {
  if (status === 404) return { kind: "unrated" };
  if (status !== 200) return { kind: "failed" };
  if (!isRecord(body)) return { kind: "failed" };

  const ranks = body["ranks"];
  if (ranks === undefined || ranks === null) return { kind: "unrated" };
  if (!isRecord(ranks)) return { kind: "failed" };

  const premier = ranks["premier"];
  if (premier === undefined || premier === null || premier === 0) return { kind: "unrated" };
  if (typeof premier !== "number" || !Number.isInteger(premier)) return { kind: "failed" };
  if (premier < 1 || premier > MAX_RATING) return { kind: "failed" };
  return { kind: "rated", rating: premier };
}

/**
 * Escalón de la escala de CS2 para datos reales: Grey 0–4999, Light Blue 5000–9999, … Gold 30000
 * o más, sin tope (RF-4, D2). Es la escala de la spec 004 con Gold abierto: el tope de 34999 de
 * `pointsBand` rige solo para los datos simulados.
 */
export function cs2RealStep(rating: number): number {
  if (!Number.isInteger(rating) || rating < 0) {
    throw new RangeError(`rating Premier inválido: ${rating}`);
  }
  return Math.min(GAMES.cs2.tiers.length - 1, Math.floor(rating / STEP_WIDTH));
}

/** Fotografía de un rating: escalón, rating exacto y normalizado de la 004 (RF-4, RF-5). */
export function premierSnapshot(rating: number, now: Date): Snapshot {
  const step = cs2RealStep(rating);
  const tier = GAMES.cs2.tiers[step];
  if (tier === undefined) throw new RangeError(`escalón sin tier: ${step}`);
  return { tier, points: rating, normalized: normalizeStep("cs2", step), recordedAt: now };
}

/**
 * Estado de una cuenta recién verificada (RF-3, RF-11, RF-15, D27): se descarta el rango y el
 * historial simulados sea cual sea la lectura y no se crea historial real (siempre `[]`). Un fallo
 * deja el rango no disponible (D11).
 */
export function verifiedPremier(reading: LeetifyReading, now: Date): PremierState {
  switch (reading.kind) {
    case "rated":
      return { premier: "rated", currentRank: premierSnapshot(reading.rating, now), rankHistory: [] };
    case "unrated":
      return { premier: "unrated", currentRank: null, rankHistory: [] };
    case "failed":
      return { premier: "unavailable", currentRank: null, rankHistory: [] };
  }
}

/**
 * Transición de una cuenta que se resincroniza (RF-9, RF-11, RF-18, D27; tabla del plan, sección
 * 1). No muta `state`. El historial queda siempre vacío: ninguna lectura agrega puntos.
 * - Con rango: el rango vigente toma la lectura nueva, sea igual, mayor o menor.
 * - Sin rango Premier: la cuenta pasa a sin rango y el rating se borra (RF-9).
 * - Fallo: nada cambia, así que la cuenta conserva su rating y sigue en coincidencias (RF-18).
 */
export function applyLeetifyReading(state: PremierState, reading: LeetifyReading, now: Date): PremierState {
  switch (reading.kind) {
    case "failed":
      return state;
    case "unrated":
      return { premier: "unrated", currentRank: null, rankHistory: [] };
    case "rated":
      return { premier: "rated", currentRank: premierSnapshot(reading.rating, now), rankHistory: [] };
  }
}

// ---------------------------------------------------------------------------------------------
// Partidas recientes de CS2 desde Leetify (spec 019, RF-2, RF-3, RF-7, RF-8, RF-9; plan, §2).
// Salen de la misma respuesta de `GET /v3/profile` (`recent_matches`). Se leen en vivo y nunca
// se guardan (D1). De cada partida solo se toma fecha, mapa, resultado y marcador (RF-3).

/** Como máximo se muestran las 8 partidas más recientes (spec 019, D3). */
export const LEETIFY_MATCHES_LIMIT = 8;

/** Resultado de una partida tal como lo informa Leetify (RF-3). */
export type LeetifyOutcome = "win" | "loss" | "tie";

const OUTCOMES: readonly LeetifyOutcome[] = ["win", "loss", "tie"];

export interface LeetifyMatch {
  /** Identificador de Leetify; sin uno de texto, la fecha (solo sirve de clave en la lista). */
  id: string;
  /** Fecha de término en ISO 8601. */
  finishedAt: string;
  /** Mapa tal como lo entrega Leetify (por ejemplo, `de_mirage`). */
  map: string;
  outcome: LeetifyOutcome;
  /** Marcador en el orden que lo entrega Leetify, sin recalcular. */
  score: [number, number];
}

/** Lectura de las partidas: con la lista (quizá vacía, RF-8) o fallo (RF-7). */
export type LeetifyMatchesReading = { kind: "matches"; matches: LeetifyMatch[] } | { kind: "failed" };

/** Error de la ruta de partidas cuando la cuenta no las obtiene de Leetify (plan, §3). */
export const LEETIFY_MATCH_ERRORS = {
  notFromLeetify: "esta cuenta no obtiene sus partidas de Leetify",
} as const;

function isScore(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    value.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0)
  );
}

/** Una partida válida o `null` si le falta algo de RF-9. */
function parseMatch(value: unknown): { match: LeetifyMatch; time: number } | null {
  if (!isRecord(value)) return null;
  const finishedAt = value["finished_at"];
  const map = value["map_name"];
  const outcome = value["outcome"];
  const score = value["score"];
  if (typeof finishedAt !== "string") return null;
  const time = Date.parse(finishedAt);
  if (!Number.isFinite(time)) return null;
  if (typeof map !== "string" || map.trim() === "") return null;
  if (typeof outcome !== "string" || !OUTCOMES.includes(outcome as LeetifyOutcome)) return null;
  if (!isScore(score)) return null;
  const id = value["id"];
  return {
    match: {
      id: typeof id === "string" && id !== "" ? id : finishedAt,
      finishedAt,
      map,
      outcome: outcome as LeetifyOutcome,
      score: [score[0], score[1]],
    },
    time,
  };
}

/**
 * Partidas recientes de la respuesta de `GET /v3/profile` (RF-2, RF-7, RF-8, RF-9).
 * - 404 (sin perfil) o `recent_matches` ausente o nulo → lista vacía.
 * - Otro estado distinto de 200, cuerpo ilegible o `recent_matches` que no es arreglo → fallo.
 * - Las partidas inválidas se omiten; el resto va de la más reciente a la más antigua, hasta 8.
 */
export function parseLeetifyMatches(status: number, body: unknown): LeetifyMatchesReading {
  if (status === 404) return { kind: "matches", matches: [] };
  if (status !== 200 || !isRecord(body)) return { kind: "failed" };
  const recent = body["recent_matches"];
  if (recent === undefined || recent === null) return { kind: "matches", matches: [] };
  if (!Array.isArray(recent)) return { kind: "failed" };
  const matches = recent
    .map(parseMatch)
    .filter((parsed): parsed is { match: LeetifyMatch; time: number } => parsed !== null)
    .sort((a, b) => b.time - a.time)
    .slice(0, LEETIFY_MATCHES_LIMIT)
    .map(({ match }) => match);
  return { kind: "matches", matches };
}
