import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { GAME_IDS } from '@/domain/games';
import { removeSessionFromList, upsertSessionInList } from '@/domain/sessionList';
import type { GameId, PlaySession } from '@/domain/types';

/** Efectos del detalle sobre la agenda ya cargada (spec 009, plan 4.4; RF-15, RF-19). */

/** Los filtros de la agenda: la clave de cada lista es `['u', userId, 'sessions', filtro]`. */
const FILTERS: readonly (GameId | 'all')[] = ['all', ...GAME_IDS];

/**
 * Reemplaza o inserta la sesión en cada lista guardada de la agenda y marca las listas como
 * desactualizadas: solo pide de nuevo la que está montada (la agenda tiene `staleTime: 0`).
 */
export function applySessionToAgenda(
  queryClient: QueryClient,
  userId: string | null,
  session: PlaySession,
): void {
  for (const filter of FILTERS) {
    queryClient.setQueriesData<PlaySession[]>(
      { queryKey: queryKeys.sessions(userId, filter) },
      (list) => (list ? upsertSessionInList(list, session, filter) : list),
    );
  }
  markAgendaStale(queryClient, userId);
}

/** Quita la sesión de cada lista guardada de la agenda y marca las listas como desactualizadas. */
export function removeSessionFromAgenda(
  queryClient: QueryClient,
  userId: string | null,
  sessionId: string,
): void {
  queryClient.setQueriesData<PlaySession[]>(
    { queryKey: queryKeys.sessionLists(userId) },
    (list) => (list ? removeSessionFromList(list, sessionId) : list),
  );
  markAgendaStale(queryClient, userId);
}

/** Solo marca: la agenda vuelve a pedir si está montada; si no, al montarse. */
export function markAgendaStale(queryClient: QueryClient, userId: string | null): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.sessionLists(userId) });
}
