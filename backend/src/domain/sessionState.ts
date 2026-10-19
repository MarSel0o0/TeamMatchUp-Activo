// Reglas puras de estado, orden y vista de la agenda de sesiones de juego (spec 006, RF-2, RF-4,
// RF-7, RF-8, RF-11 a RF-14, RF-16, RF-17, RF-24, RNF-1; plan, secciones 2, 3.5 y 3.6). Sin
// Express, Mongoose, reloj ni acceso a datos: el instante llega como parámetro `now`.

import { SESSION_ERRORS } from "./sessionRules.ts";
import type { CreateInput, RuleResult, SessionPatch } from "./sessionRules.ts";
import type { GameId } from "./games.ts";

export type SessionStatus = "open" | "full";

/** Forma pura de una sesión guardada: identificadores como texto, participantes en orden. */
export interface SessionRecord {
  id: string;
  gameId: GameId;
  hostId: string;
  title: string;
  notes: string;
  day: number;
  startHour: number;
  durationHours: number;
  slots: number;
  participantIds: readonly string[];
  status: SessionStatus;
  createdAt: Date;
}

export type StateResult =
  | { ok: true; value: SessionRecord }
  | { ok: false; status: 400 | 403 | 409; error: string };

/** Referencia de usuario de la vista: exactamente estos cuatro campos (RNF-1). */
export interface UserRef {
  id: string;
  username: string;
  displayName: string;
  avatarColor: string;
}

/** Representación pública de la sesión (RNF-1); los campos van en este orden. */
export interface SessionView {
  id: string;
  gameId: GameId;
  hostId: string;
  host: UserRef;
  title: string;
  notes: string;
  day: number;
  startHour: number;
  durationHours: number;
  slots: number;
  participants: UserRef[];
  status: SessionStatus;
  createdAt: string;
}

function failure(status: 400 | 403 | 409, error: string): StateResult {
  return { ok: false, status, error };
}

/** Llena cuando los participantes alcanzan los cupos (RF-11, RF-13). */
export function statusFor(participantCount: number, slots: number): SessionStatus {
  return participantCount >= slots ? "full" : "open";
}

/** Copia de la sesión con los participantes dados y el estado recalculado. */
function withParticipants(s: SessionRecord, participantIds: readonly string[]): SessionRecord {
  return { ...s, participantIds, status: statusFor(participantIds.length, s.slots) };
}

/**
 * Editar (RF-7, RF-8, RF-10; orden de RF-20): anfitrión → datos → cupos bajo los inscritos. Los
 * inscritos son los guardados, no los visibles (DP6-38). Recalcula el estado.
 */
export function applyEdit(
  s: SessionRecord,
  userId: string,
  patch: RuleResult<SessionPatch>,
): StateResult {
  if (s.hostId !== userId) return failure(403, SESSION_ERRORS.notHostEdit);
  if (!patch.ok) return failure(400, patch.error);
  const next: SessionRecord = { ...s, ...patch.value };
  if (next.slots < s.participantIds.length) {
    return failure(400, SESSION_ERRORS.slotsBelowParticipants);
  }
  return { ok: true, value: withParticipants(next, next.participantIds) };
}

/**
 * Sumarse (RF-11, RF-12, DP6-10, DP6-38): "ya inscrito" antes que "llena"; "llena" se mide con
 * los participantes guardados.
 */
export function applyJoin(s: SessionRecord, userId: string): StateResult {
  if (s.participantIds.includes(userId)) return failure(409, SESSION_ERRORS.alreadyJoined);
  if (s.participantIds.length >= s.slots) return failure(409, SESSION_ERRORS.full);
  return { ok: true, value: withParticipants(s, [...s.participantIds, userId]) };
}

/** Salir (RF-13, RF-14, RF-17): el anfitrión (RF-14) antes que el no inscrito (RF-17). */
export function applyLeave(s: SessionRecord, userId: string): StateResult {
  if (userId === s.hostId) return failure(409, SESSION_ERRORS.hostLeave);
  if (!s.participantIds.includes(userId)) return failure(409, SESSION_ERRORS.notJoined);
  return {
    ok: true,
    value: withParticipants(
      s,
      s.participantIds.filter((id) => id !== userId),
    ),
  };
}

/** Cascada de RF-16: quita al participante (si no está, no cambia nada) y recalcula el estado. */
export function removeParticipant(s: SessionRecord, userId: string): SessionRecord {
  return withParticipants(
    s,
    s.participantIds.filter((id) => id !== userId),
  );
}

/** Sesión nueva (RF-5): anfitrión único participante, `open` y `createdAt = now`. */
export function newSession(
  input: CreateInput,
  hostId: string,
  now: Date,
): Omit<SessionRecord, "id"> {
  return {
    gameId: input.gameId,
    title: input.title,
    notes: input.notes,
    day: input.day,
    startHour: input.startHour,
    durationHours: input.durationHours,
    slots: input.slots,
    hostId,
    participantIds: [hostId],
    status: "open",
    createdAt: now,
  };
}

/**
 * Compara por código Unicode (no por unidad UTF-16, como haría `<`): el primer código distinto
 * decide; si uno es prefijo del otro, va primero el más corto (DP6-15, P6-8). Propia de la 006:
 * no se importa de `matching.ts`.
 */
export function compareByCodePoint(a: string, b: string): number {
  let indexA = 0;
  let indexB = 0;
  while (indexA < a.length && indexB < b.length) {
    const codeA = a.codePointAt(indexA);
    const codeB = b.codePointAt(indexB);
    if (codeA === undefined || codeB === undefined) break;
    if (codeA !== codeB) return codeA < codeB ? -1 : 1;
    indexA += codeA > 0xffff ? 2 : 1;
    indexB += codeB > 0xffff ? 2 : 1;
  }
  const remainingA = a.length - indexA;
  const remainingB = b.length - indexB;
  if (remainingA === remainingB) return 0;
  return remainingA < remainingB ? -1 : 1;
}

/** Orden de RF-2: día, hora de inicio, fecha de creación (más antigua primero) e id (DP6-15). */
export function compareSessions(a: SessionRecord, b: SessionRecord): number {
  return (
    a.day - b.day ||
    a.startHour - b.startHour ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    compareByCodePoint(a.id, b.id)
  );
}

/** Solo los cuatro campos públicos, aunque el mapa traiga más (RNF-1: sin correo ni hash). */
function pickRef(user: UserRef): UserRef {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarColor: user.avatarColor,
  };
}

/**
 * Vista de una sesión (RF-4, RF-24, RNF-1): sin anfitrión en `users` → `null`; el participante
 * ausente se filtra. El `status` sale tal como está guardado (DP6-26).
 */
export function toSessionView(
  s: SessionRecord,
  users: ReadonlyMap<string, UserRef>,
): SessionView | null {
  const host = users.get(s.hostId);
  if (host === undefined) return null;
  const participants: UserRef[] = [];
  for (const id of s.participantIds) {
    const user = users.get(id);
    if (user !== undefined) participants.push(pickRef(user));
  }
  return {
    id: s.id,
    gameId: s.gameId,
    hostId: s.hostId,
    host: pickRef(host),
    title: s.title,
    notes: s.notes,
    day: s.day,
    startHour: s.startHour,
    durationHours: s.durationHours,
    slots: s.slots,
    participants,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
  };
}

/** Listado (RF-2, RF-24): ordena sin tocar la entrada y omite las sesiones sin anfitrión. */
export function assembleSessionViews(
  list: readonly SessionRecord[],
  users: ReadonlyMap<string, UserRef>,
): SessionView[] {
  const views: SessionView[] = [];
  for (const s of [...list].sort(compareSessions)) {
    const view = toSessionView(s, users);
    if (view !== null) views.push(view);
  }
  return views;
}
