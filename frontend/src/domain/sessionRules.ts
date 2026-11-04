// Reglas puras de las sesiones de juego en la interfaz (spec 009; copia de la interfaz de
// `backend/src/domain/sessionRules.ts`, spec 006). Sin React, `fetch`, almacenamiento ni reloj.

import type { WeekDay } from './types';

/** Textos exactos de la 006. `game` y `noAccount` no se copian: la edición no toca el juego. */
export const SESSION_ERRORS = {
  title: 'El título debe tener entre 3 y 60 caracteres.',
  notes: 'Las notas deben ser texto de hasta 160 caracteres.',
  day: 'Día no válido: usa un entero de 0 (lunes) a 6 (domingo).',
  startHour: 'Hora de inicio no válida: usa un entero de 0 a 23.',
  durationHours: 'Duración no válida: usa un entero de 1 a 4 horas.',
  slots: 'Cupos no válidos: usa un entero de 2 a 6.',
  slotsBelowParticipants: 'No puedes dejar menos cupos que jugadores inscritos.',
  notFound: 'Sesión no encontrada.',
  notHostEdit: 'Solo quien organiza puede editar la sesión.',
  notHostCancel: 'Solo quien organiza puede cancelar la sesión.',
  alreadyJoined: 'Ya estás inscrito en esta sesión.',
  full: 'Esta sesión ya no admite jugadores.',
  hostLeave: 'Eres quien organiza: cancela la sesión en lugar de salir.',
  notJoined: 'No estás inscrito en esta sesión.',
  badId: 'id con formato inválido',
  badJson: 'JSON mal formado',
} as const;

export const TITLE_MAX_LENGTH = 60;
export const NOTES_MAX_LENGTH = 160;

export type RuleResult<T> = { ok: true; value: T } | { ok: false; status: 400; error: string };

// Conjunto de DP6-27: tabulador, U+000B, U+000C, espacio, U+00A0, U+FEFF, categoría Zs, LF, CR,
// U+2028 y U+2029. U+0085 y U+200B no se recortan.
const TRIM_FIXED = new Set([
  '\u0009',
  '\u000B',
  '\u000C',
  ' ',
  '\u00A0',
  '\uFEFF',
  '\u000A',
  '\u000D',
  '\u2028',
  '\u2029',
]);
const SPACE_SEPARATOR = /^\p{Zs}$/u;

function isTrimChar(char: string): boolean {
  return TRIM_FIXED.has(char) || SPACE_SEPARATOR.test(char);
}

// DP6-31: categoría Cc más U+2028 y U+2029.
const FORBIDDEN_TITLE_PATTERN = /[\p{Cc}\u2028\u2029]/u;

/** Recorta los dos extremos con el conjunto de DP6-27; el interior no se toca. */
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

/** Se aplica al título ya recortado. */
export function hasForbiddenTitleChar(text: string): boolean {
  return FORBIDDEN_TITLE_PATTERN.test(text);
}

/** LA regla del título (RF-22.1, RF-24): recorta, sin prohibidos, 3 a 60 puntos de código. */
export function isValidSessionTitle(raw: string): boolean {
  const text = trimText(raw);
  if (hasForbiddenTitleChar(text)) return false;
  const length = codePointLength(text);
  return length >= 3 && length <= TITLE_MAX_LENGTH;
}

/** Índices en unidades UTF-16 del valor ANTERIOR (los de `selectionStart` / `selectionEnd`). */
export interface TextSelection {
  start: number;
  end: number;
}

export interface TextEdit {
  /** Valor antes del cambio (el controlado). */
  previous: string;
  /** Valor que propone el navegador tras el cambio. */
  next: string;
  /** Selección justo antes del cambio; `null` si no se conoce. */
  selection: TextSelection | null;
}

export interface LimitedText {
  /** Valor final del campo. */
  value: string;
  /** Cursor que hay que poner; `null` = no tocarlo. */
  selection: TextSelection | null;
}

function splitsSurrogatePair(text: string, index: number): boolean {
  const before = text.charCodeAt(index - 1);
  const after = text.charCodeAt(index);
  return before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
}

/**
 * Límite de escritura en puntos de código para título (60) y notas (160). Se comporta como
 * `maxLength`: lo que ya estaba se conserva entero y solo entra la parte de lo insertado que cabe,
 * sin partir un emoji ni un par sustituto; el cursor queda al final de lo insertado (D-29).
 */
export function limitToCodePoints(edit: TextEdit, max: number): LimitedText {
  const { previous, next, selection } = edit;
  const nextLength = codePointLength(next);
  if (nextLength <= max) return { value: next, selection: null };
  if (nextLength <= codePointLength(previous)) return { value: next, selection: null };

  const unchanged: LimitedText = { value: previous, selection };
  if (
    selection === null ||
    selection.start < 0 ||
    selection.start > selection.end ||
    selection.end > previous.length ||
    splitsSurrogatePair(previous, selection.start) ||
    splitsSurrogatePair(previous, selection.end)
  ) {
    return unchanged;
  }

  const prefix = previous.slice(0, selection.start);
  const suffix = previous.slice(selection.end);
  if (
    next.length < prefix.length + suffix.length ||
    !next.startsWith(prefix) ||
    !next.endsWith(suffix)
  ) {
    return unchanged;
  }

  const inserted = next.slice(prefix.length, next.length - suffix.length);
  const room = max - codePointLength(prefix) - codePointLength(suffix);
  let fits = '';
  let used = 0;
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(
    inserted,
  )) {
    const size = codePointLength(segment);
    if (used + size > room) break;
    fits += segment;
    used += size;
  }
  if (fits === '') return unchanged;

  const cursor = prefix.length + fits.length;
  return { value: prefix + fits + suffix, selection: { start: cursor, end: cursor } };
}

/** Entero JSON dentro de [min, max]; cualquier otra cosa da `null`. */
export function readJsonInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null;
  const n = value + 0;
  return n >= min && n <= max ? n : null;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface SessionEditFields {
  title: string;
  notes: string;
  day: WeekDay;
  startHour: number;
  durationHours: number;
  slots: number;
}

/** Solo los campos enviados en la edición. */
export type SessionPatch = Partial<SessionEditFields>;

function failure(error: string): { ok: false; status: 400; error: string } {
  return { ok: false, status: 400, error };
}

/** Título válido: texto que cumple `isValidSessionTitle`; se guarda recortado. */
function checkTitle(value: unknown): string | null {
  if (typeof value !== 'string' || !isValidSessionTitle(value)) return null;
  return trimText(value);
}

/** Notas válidas: texto recortado de hasta 160 puntos de código; vacías valen. */
function checkNotes(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = trimText(value);
  return codePointLength(text) <= NOTES_MAX_LENGTH ? text : null;
}

/**
 * Edición parcial (006 RF-7, RF-26): valida solo los campos propios enviados, en el orden título →
 * notas → día → hora → duración → cupos; ignora cualquier otro campo. `{}` es un parche vacío.
 */
export function validateSessionEdit(body: unknown): RuleResult<SessionPatch> {
  const fields = isPlainObject(body) ? body : {};
  const patch: SessionPatch = {};

  if (Object.hasOwn(fields, 'title')) {
    const title = checkTitle(fields['title']);
    if (title === null) return failure(SESSION_ERRORS.title);
    patch.title = title;
  }
  if (Object.hasOwn(fields, 'notes')) {
    const notes = checkNotes(fields['notes']);
    if (notes === null) return failure(SESSION_ERRORS.notes);
    patch.notes = notes;
  }
  if (Object.hasOwn(fields, 'day')) {
    const day = readJsonInteger(fields['day'], 0, 6);
    if (day === null) return failure(SESSION_ERRORS.day);
    patch.day = day as WeekDay;
  }
  if (Object.hasOwn(fields, 'startHour')) {
    const startHour = readJsonInteger(fields['startHour'], 0, 23);
    if (startHour === null) return failure(SESSION_ERRORS.startHour);
    patch.startHour = startHour;
  }
  if (Object.hasOwn(fields, 'durationHours')) {
    const durationHours = readJsonInteger(fields['durationHours'], 1, 4);
    if (durationHours === null) return failure(SESSION_ERRORS.durationHours);
    patch.durationHours = durationHours;
  }
  if (Object.hasOwn(fields, 'slots')) {
    const slots = readJsonInteger(fields['slots'], 2, 6);
    if (slots === null) return failure(SESSION_ERRORS.slots);
    patch.slots = slots;
  }

  return { ok: true, value: patch };
}
