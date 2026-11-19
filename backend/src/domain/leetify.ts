// Rango Premier real de CS2 desde Leetify (spec 015, RF-2 a RF-5, RF-9, RF-11, RF-14, RF-18,
// RNF-5; plan, secciones 1, 3 y 4.1). Funciones puras: sin Express, Mongoose, red ni reloj
// («hoy» llega como parámetro) y sin importar nada fuera de `domain/`.
// - Una lectura de Leetify termina de una de tres formas (Definiciones): con rango, sin rango
//   Premier o fallo. Nunca se guarda un dato dudoso: lo que no encaja en RF-2 es fallo (D13).
// - Solo se lee `ranks.premier` del perfil; el resto de la respuesta no se toca (D3, RNF-3).
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
