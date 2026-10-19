// Lectura de sesiones de juego (spec 006, plan, secciones 1, 4 y 6). RF-2, RF-3, RF-4, RF-24.
// - Lee la base y delega las reglas (orden, vista, omisión por anfitrión inexistente) en
//   `domain/sessionState.ts`; aquí no se decide nada del dominio.
// - Sin `populate` ni `$lookup` (P6-4): los usuarios se resuelven aparte con `loadUserRefs`, una
//   sola consulta con solo los tres campos públicos.
import type { Types } from "mongoose";
import type { GameId } from "../domain/games.ts";
import { assembleSessionViews, toSessionView } from "../domain/sessionState.ts";
import type { SessionRecord, SessionStatus, SessionView, UserRef } from "../domain/sessionState.ts";
import { PlaySession } from "../models/playSession.ts";
import { User } from "../models/user.ts";

/** Forma mínima común al documento hidratado y al `lean()` de `PlaySession`. */
interface StoredSession {
  _id: Types.ObjectId;
  gameId: GameId;
  host: Types.ObjectId;
  title: string;
  notes: string;
  day: number;
  startHour: number;
  durationHours: number;
  slots: number;
  participants: readonly Types.ObjectId[];
  status: SessionStatus;
  createdAt: Date;
}

/** Documento (o `lean()`) → forma pura: identificadores como texto, participantes en orden. */
export function toRecord(stored: StoredSession): SessionRecord {
  return {
    id: stored._id.toString(),
    gameId: stored.gameId,
    hostId: stored.host.toString(),
    title: stored.title,
    notes: stored.notes,
    day: stored.day,
    startHour: stored.startHour,
    durationHours: stored.durationHours,
    slots: stored.slots,
    participantIds: stored.participants.map((participant) => participant.toString()),
    status: stored.status,
    createdAt: stored.createdAt,
  };
}

/**
 * Referencias de los usuarios dados que existen (una sola consulta; solo `username`,
 * `displayName` y `avatarColor`, nunca correo ni hash). Los ausentes no aparecen en el mapa.
 */
export async function loadUserRefs(ids: Iterable<string>): Promise<Map<string, UserRef>> {
  const unique = [...new Set(ids)];
  const refs = new Map<string, UserRef>();
  if (unique.length === 0) return refs;
  const users = await User.find(
    { _id: { $in: unique } },
    { username: 1, displayName: 1, avatarColor: 1 },
  ).lean();
  for (const user of users) {
    const id = user._id.toString();
    refs.set(id, {
      id,
      username: user.username,
      displayName: user.displayName,
      avatarColor: user.avatarColor,
    });
  }
  return refs;
}

function userIdsOf(records: readonly SessionRecord[]): Set<string> {
  const userIds = new Set<string>();
  for (const record of records) {
    userIds.add(record.hostId);
    for (const participantId of record.participantIds) userIds.add(participantId);
  }
  return userIds;
}

/** Vista de una sesión por id; `null` si no existe o si su anfitrión ya no existe (RF-24). */
export async function loadSessionView(id: string): Promise<SessionView | null> {
  const stored = await PlaySession.findById(id).lean();
  if (stored === null) return null;
  const record = toRecord(stored);
  return toSessionView(record, await loadUserRefs(userIdsOf([record])));
}

/** Vistas ordenadas (RF-2) de todas las sesiones o de un juego; omite las sin anfitrión (RF-24). */
export async function listSessionViews(gameId: GameId | null): Promise<SessionView[]> {
  const stored = await PlaySession.find(gameId === null ? {} : { gameId }).lean();
  const records = stored.map(toRecord);
  return assembleSessionViews(records, await loadUserRefs(userIdsOf(records)));
}
