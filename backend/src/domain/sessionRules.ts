// Reglas puras de la agenda de sesiones de juego (spec 006, RF-6, RF-7, RF-15, RF-22, RF-26, RF-27,
// RNF-2, RNF-3; plan, secciones 2, 3.1 a 3.4 y 7). Sin Express, Mongoose, reloj ni acceso a datos.

import { isGameId } from "./games.ts";
import type { GameId } from "./games.ts";

/** Textos exactos de la sección 7 del plan (algunos heredados de las specs 002 y 003). */
export const SESSION_ERRORS = {
  game: "Juego no válido.",
  noAccount: "No tienes una cuenta vinculada en este juego.",
  title: "El título debe tener entre 3 y 60 caracteres.",
  notes: "Las notas deben ser texto de hasta 160 caracteres.",
  day: "Día no válido: usa un entero de 0 (lunes) a 6 (domingo).",
  startHour: "Hora de inicio no válida: usa un entero de 0 a 23.",
  durationHours: "Duración no válida: usa un entero de 1 a 4 horas.",
  slots: "Cupos no válidos: usa un entero de 2 a 6.",
  slotsBelowParticipants: "No puedes dejar menos cupos que jugadores inscritos.",
  notFound: "Sesión no encontrada.",
  notHostEdit: "Solo quien organiza puede editar la sesión.",
  notHostCancel: "Solo quien organiza puede cancelar la sesión.",
  alreadyJoined: "Ya estás inscrito en esta sesión.",
  full: "Esta sesión ya no admite jugadores.",
  hostLeave: "Eres quien organiza: cancela la sesión en lugar de salir.",
  notJoined: "No estás inscrito en esta sesión.",
  badId: "id con formato inválido",
  badJson: "JSON mal formado",
} as const;

export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };

// Conjunto de DP6-27, escrito carácter a carácter (no `String.prototype.trim`, P6-6): tabulador,
// U+000B, U+000C, espacio, U+00A0, U+FEFF, categoría Zs, LF, CR, U+2028 y U+2029. U+0085 y
// U+200B no están. Se comprueba carácter a carácter (regex de un solo carácter, sin cuantificadores)
// para que el recorte sea lineal: una regex `^X+|X+$` es cuadrática con rachas largas en el interior.
const TRIM_FIXED = new Set([
  "\u0009",
  "\u000B",
  "\u000C",
  " ",
  " ",
  "﻿",
  "\u000A",
  "\u000D",
  " ",
  " ",
]);
const SPACE_SEPARATOR = /^\p{Zs}$/u;

function isTrimChar(char: string): boolean {
  return TRIM_FIXED.has(char) || SPACE_SEPARATOR.test(char);
}

// DP6-31: categoría Cc (U+0000 a U+001F y U+007F a U+009F) más U+2028 y U+2029.
const FORBIDDEN_TITLE_PATTERN = /[\p{Cc}\u2028\u2029]/u;

/** Recorta los dos extremos con el conjunto de DP6-27; el interior no se toca (RNF-2). */
export function trimText(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && isTrimChar(text.charAt(start))) start += 1;
  while (end > start && isTrimChar(text.charAt(end - 1))) end -= 1;
  return text.slice(start, end);
}

/** Largo en puntos de código: un emoji cuenta 1. */
export function codePointLength(text: string): number {
  return [...text].length;
}

/** Se aplica al título ya recortado (DP6-23, DP6-31). */
export function hasForbiddenTitleChar(text: string): boolean {
  return FORBIDDEN_TITLE_PATTERN.test(text);
}

/**
 * Número entero JSON dentro de [min, max] (DP6-2). `"3"`, `3.5`, `true`, `null`, `NaN` e
 * `Infinity` dan `null`; `3.0` ya llega como `3` tras `JSON.parse`; `-0` se normaliza a 0.
 */
export function readJsonInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  const n = value + 0;
  return n >= min && n <= max ? n : null;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface SessionFields {
  title: string;
  notes: string;
  day: number;
  startHour: number;
  durationHours: number;
  slots: number;
}

export interface CreateInput extends SessionFields {
  gameId: GameId;
}

/** Solo los campos enviados en la edición (RF-7, DP6-1). */
export type SessionPatch = Partial<SessionFields>;

type Failure = { ok: false; status: 400; error: string };

function failure(error: string): Failure {
  return { ok: false, status: 400, error };
}

/** Un cuerpo ausente o que no es un objeto se trata como `{}` (DP6-29, DP6-36). */
function bodyFields(body: unknown): Record<string, unknown> {
  return isPlainObject(body) ? body : {};
}

/** Lee solo claves propias: `constructor` o `__proto__` heredados no cuentan como enviados. */
function ownValue(fields: Record<string, unknown>, key: string): unknown {
  return Object.hasOwn(fields, key) ? fields[key] : undefined;
}

/** Título válido: texto, recortado, sin caracteres prohibidos y de 3 a 60 puntos de código. */
function checkTitle(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = trimText(value);
  if (hasForbiddenTitleChar(text)) return null;
  const length = codePointLength(text);
  return length >= 3 && length <= 60 ? text : null;
}

/** Notas válidas: texto recortado de hasta 160 puntos de código; vacías valen (DP6-22). */
function checkNotes(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = trimText(value);
  return codePointLength(text) <= 160 ? text : null;
}

/**
 * Crear (RF-6, RF-15, RF-27, DP6-9): primer fallo en el orden juego → cuenta vinculada → título →
 * notas → día → hora → duración → cupos. Solo salen los siete campos; el resto se ignora.
 */
export function validateCreatePayload(
  body: unknown,
  linkedGames: ReadonlySet<GameId>,
): RuleResult<CreateInput> {
  const fields = bodyFields(body);

  const gameId = ownValue(fields, "gameId");
  if (typeof gameId !== "string" || !isGameId(gameId)) return failure(SESSION_ERRORS.game);
  if (!linkedGames.has(gameId)) return failure(SESSION_ERRORS.noAccount);

  const title = checkTitle(ownValue(fields, "title"));
  if (title === null) return failure(SESSION_ERRORS.title);

  const notes = Object.hasOwn(fields, "notes") ? checkNotes(fields["notes"]) : "";
  if (notes === null) return failure(SESSION_ERRORS.notes);

  const day = readJsonInteger(ownValue(fields, "day"), 0, 6);
  if (day === null) return failure(SESSION_ERRORS.day);

  const startHour = readJsonInteger(ownValue(fields, "startHour"), 0, 23);
  if (startHour === null) return failure(SESSION_ERRORS.startHour);

  const durationHours = readJsonInteger(ownValue(fields, "durationHours"), 1, 4);
  if (durationHours === null) return failure(SESSION_ERRORS.durationHours);

  const slots = readJsonInteger(ownValue(fields, "slots"), 2, 6);
  if (slots === null) return failure(SESSION_ERRORS.slots);

  return { ok: true, value: { gameId, title, notes, day, startHour, durationHours, slots } };
}

/**
 * Editar (RF-7, RF-26, DP6-1, DP6-19, DP6-22): valida solo los campos propios enviados, en el
 * orden título → notas → día → hora → duración → cupos. Nunca lee `gameId`. `{}` es un parche
 * vacío (sin cambios).
 */
export function validateSessionEdit(body: unknown): RuleResult<SessionPatch> {
  const fields = bodyFields(body);
  const patch: SessionPatch = {};

  if (Object.hasOwn(fields, "title")) {
    const title = checkTitle(fields["title"]);
    if (title === null) return failure(SESSION_ERRORS.title);
    patch.title = title;
  }
  if (Object.hasOwn(fields, "notes")) {
    const notes = checkNotes(fields["notes"]);
    if (notes === null) return failure(SESSION_ERRORS.notes);
    patch.notes = notes;
  }
  if (Object.hasOwn(fields, "day")) {
    const day = readJsonInteger(fields["day"], 0, 6);
    if (day === null) return failure(SESSION_ERRORS.day);
    patch.day = day;
  }
  if (Object.hasOwn(fields, "startHour")) {
    const startHour = readJsonInteger(fields["startHour"], 0, 23);
    if (startHour === null) return failure(SESSION_ERRORS.startHour);
    patch.startHour = startHour;
  }
  if (Object.hasOwn(fields, "durationHours")) {
    const durationHours = readJsonInteger(fields["durationHours"], 1, 4);
    if (durationHours === null) return failure(SESSION_ERRORS.durationHours);
    patch.durationHours = durationHours;
  }
  if (Object.hasOwn(fields, "slots")) {
    const slots = readJsonInteger(fields["slots"], 2, 6);
    if (slots === null) return failure(SESSION_ERRORS.slots);
    patch.slots = slots;
  }

  return { ok: true, value: patch };
}

/**
 * Filtro de juego del listado (RF-22, DP6-3, DP6-20): ausente o `all` → `null` (todos); un
 * juego exacto → ese juego; vacío, repetido o cualquier otro valor → 400. Las demás claves de la
 * consulta no se leen.
 */
export function parseGameFilter(
  query: Readonly<Record<string, unknown>>,
): RuleResult<GameId | null> {
  if (!Object.hasOwn(query, "game")) return { ok: true, value: null };
  const value = query["game"];
  if (value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") return gameError();
  if (value === "all") return { ok: true, value: null };
  if (isGameId(value)) return { ok: true, value };
  return gameError();
}

function gameError(): Failure {
  return failure(SESSION_ERRORS.game);
}
