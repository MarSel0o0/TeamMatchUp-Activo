import type { GameId, MatchFilters } from '@/domain/types';

/**
 * Claves de caché centralizadas.
 *
 * Todas empiezan por `['u', userId]` (HU-3): una cuenta nueva nunca encuentra en
 * memoria los datos de la anterior, aunque quedara una consulta colgada. Con
 * `userId` nulo (sin sesión) la clave existe pero la consulta no se ejecuta
 * (`enabled: userId !== null`).
 */
export type QueryUserId = string | null;

export const queryKeys = {
  accounts: (userId: QueryUserId) => ['u', userId, 'profile', 'accounts'] as const,
  availability: (userId: QueryUserId) => ['u', userId, 'profile', 'availability'] as const,
  gameSummary: (userId: QueryUserId, gameId: GameId) =>
    ['u', userId, 'profile', 'summary', gameId] as const,
  /** Prefijo de todos los resúmenes de perfil del usuario. */
  gameSummaries: (userId: QueryUserId) => ['u', userId, 'profile', 'summary'] as const,
  matches: (userId: QueryUserId, filters: MatchFilters) =>
    ['u', userId, 'matches', filters] as const,
  /** Prefijo de todas las listas de coincidencias del usuario. */
  allMatches: (userId: QueryUserId) => ['u', userId, 'matches'] as const,
  sessions: (userId: QueryUserId, gameId: GameId | 'all') =>
    ['u', userId, 'sessions', gameId] as const,
  /** Prefijo de todas las listas de sesiones del usuario. */
  allSessions: (userId: QueryUserId) => ['u', userId, 'sessions'] as const,
} as const;

/**
 * `placeholderData` que conserva el resultado anterior solo si es del mismo
 * usuario: al cambiar de cuenta no se muestra, ni un instante, lo de la anterior.
 */
export function keepPreviousForUser<T>(
  userId: QueryUserId,
): (previous: T | undefined, previousQuery: { queryKey: readonly unknown[] } | undefined) => T | undefined {
  return (previous, previousQuery) =>
    previousQuery !== undefined && previousQuery.queryKey[1] === userId ? previous : undefined;
}
