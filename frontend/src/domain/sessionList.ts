// Listas de la agenda: orden y actualización sin pedir de nuevo (spec 009, RF-15, RF-19).
// Puras: sin React, `fetch`, almacenamiento ni reloj.

import { compareByCodePoint } from './matching';
import type { GameId, PlaySession } from './types';

type SortKey = Pick<PlaySession, 'id' | 'day' | 'startHour' | 'createdAt'>;

/** Orden del listado (006 RF-2): día, hora de inicio, creación (la más antigua primero) e id. */
export function compareSessions(a: SortKey, b: SortKey): number {
  return (
    a.day - b.day ||
    a.startHour - b.startHour ||
    Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
    compareByCodePoint(a.id, b.id)
  );
}

/** Reemplaza la sesión en su lugar; si falta y el filtro la admite, la inserta ordenada. */
export function upsertSessionInList(
  list: readonly PlaySession[],
  session: PlaySession,
  filter: GameId | 'all',
): PlaySession[] {
  if (list.some((item) => item.id === session.id)) {
    return list.map((item) => (item.id === session.id ? session : item));
  }
  if (filter === 'all' || filter === session.gameId) {
    return [...list, session].sort(compareSessions);
  }
  return list as PlaySession[];
}

export function removeSessionFromList(
  list: readonly PlaySession[],
  sessionId: string,
): PlaySession[] {
  return list.filter((item) => item.id !== sessionId);
}
