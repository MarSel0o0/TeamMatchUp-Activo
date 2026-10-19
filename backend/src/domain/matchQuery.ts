// Lectura pura de la consulta de coincidencias (spec 005, RF-5, RF-11, RF-12, RF-14, RF-15,
// RF-16, RF-18, RNF-1; plan, secciones 2, 3.1 y 6). Sin Express, Mongoose, red ni reloj: recibe
// `request.query` tal cual y devuelve los criterios o el primer error.

import { isGameId } from "./games.ts";
import type { GameId } from "./games.ts";

/**
 * Textos exactos (DP5-2, DP5-3, DP5-17): minúscula inicial y sin punto final, como DP-6 de la
 * spec 004; los rótulos entre « » conservan su mayúscula. Las comillas « » son U+00AB y U+00BB.
 */
export const MATCH_ERRORS = {
  game: "juego no válido",
  maxRankDistance:
    "filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100",
  minSharedHours:
    "filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168",
  onlyVerified: "filtro «Solo cuentas con rango verificado» no válido: usa true o false",
  search: "filtro «Buscar jugador» no válido",
  noAccount: "no tienes una cuenta vinculada en este juego",
} as const;

const MAX_RANK_DISTANCE_LIMIT = 100;
const MIN_SHARED_HOURS_LIMIT = 168;

/** Lo que llegó para un filtro (DP-10 de la spec 004): ausente, vacío, repetido o texto. */
export type FilterValue =
  | { kind: "absent" }
  | { kind: "empty" }
  | { kind: "repeated" }
  | { kind: "malformed" } // ni texto ni arreglo (p. ej. un objeto)
  | { kind: "text"; text: string };

export function readFilterValue(query: Readonly<Record<string, unknown>>, name: string): FilterValue {
  if (!Object.hasOwn(query, name)) return { kind: "absent" };
  const value = query[name];
  if (value === undefined) return { kind: "absent" };
  if (Array.isArray(value)) return { kind: "repeated" };
  if (typeof value !== "string") return { kind: "malformed" };
  if (value === "") return { kind: "empty" };
  // Sin recortar: " 5 " y " lol " son inválidos.
  return { kind: "text", text: value };
}

/**
 * Número entero válido (DP5-4): solo dígitos 0-9, base 10. Una cadena larguísima da
 * `Infinity`, que queda fuera de cualquier rango.
 */
export function parseValidInteger(text: string): number | null {
  return /^[0-9]+$/.test(text) ? Number(text) : null;
}

export interface MatchCriteria {
  gameId: GameId;
  maxRankDistance: number;
  minSharedHours: number;
  onlyVerified: boolean;
  /** `null` = no filtra; si no, ya sin espacios en los extremos. */
  search: string | null;
}

export type QueryResult =
  | { ok: true; value: MatchCriteria }
  | { ok: false; status: 400; error: string };

function fail(error: string): QueryResult {
  return { ok: false, status: 400, error };
}

/** Entero en [0, max] o `null` si el valor no es válido (vacío, repetido, forma, rango). */
function readBoundedInteger(value: FilterValue, max: number): number | null {
  if (value.kind !== "text") return null;
  const parsed = parseValidInteger(value.text);
  return parsed !== null && parsed <= max ? parsed : null;
}

/** Primer error y nada más, en el orden de RF-16. Las claves desconocidas se ignoran (RF-18). */
export function parseMatchQuery(query: Readonly<Record<string, unknown>>): QueryResult {
  const game = readFilterValue(query, "game");
  if (game.kind !== "text" || !isGameId(game.text)) return fail(MATCH_ERRORS.game);
  const gameId = game.text;

  const distance = readFilterValue(query, "maxRankDistance");
  const maxRankDistance =
    distance.kind === "absent"
      ? MAX_RANK_DISTANCE_LIMIT
      : readBoundedInteger(distance, MAX_RANK_DISTANCE_LIMIT);
  if (maxRankDistance === null) return fail(MATCH_ERRORS.maxRankDistance);

  const hours = readFilterValue(query, "minSharedHours");
  const minSharedHours =
    hours.kind === "absent" ? 0 : readBoundedInteger(hours, MIN_SHARED_HOURS_LIMIT);
  if (minSharedHours === null) return fail(MATCH_ERRORS.minSharedHours);

  const verified = readFilterValue(query, "onlyVerified");
  let onlyVerified: boolean;
  if (verified.kind === "absent") onlyVerified = false;
  else if (verified.kind === "text" && verified.text === "true") onlyVerified = true;
  else if (verified.kind === "text" && verified.text === "false") onlyVerified = false;
  else return fail(MATCH_ERRORS.onlyVerified);

  const searchValue = readFilterValue(query, "search");
  if (searchValue.kind === "repeated" || searchValue.kind === "malformed") {
    return fail(MATCH_ERRORS.search);
  }
  // `trim()` quita los espacios en blanco Unicode (RF-9, DP5-12).
  const trimmed = searchValue.kind === "text" ? searchValue.text.trim() : "";
  const search = trimmed === "" ? null : trimmed;

  return { ok: true, value: { gameId, maxRankDistance, minSharedHours, onlyVerified, search } };
}
