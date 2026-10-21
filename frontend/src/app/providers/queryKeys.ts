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
  /**
   * Ficha de jugador (spec 008, RF-26, plan 3.6): todo bajo
   * `['u', sessionUserId, 'player', visit, …]`. `visit` es nueva en cada montaje de la
   * ficha, así que abrir o recargar pide todo de nuevo y nunca enseña datos de otra visita.
   * Los datos del otro jugador van tras `'them', id` y los propios tras `'own'`: el
   * identificador crudo de la ruta nunca puede coincidir con una clave propia (p. ej.
   * `/jugadores/own`).
   */
  player: {
    user: (userId: QueryUserId, visit: number, id: string) =>
      ['u', userId, 'player', visit, 'them', id, 'user'] as const,
    accounts: (userId: QueryUserId, visit: number, id: string) =>
      ['u', userId, 'player', visit, 'them', id, 'accounts'] as const,
    availability: (userId: QueryUserId, visit: number, id: string) =>
      ['u', userId, 'player', visit, 'them', id, 'availability'] as const,
    summary: (userId: QueryUserId, visit: number, id: string, gameId: GameId) =>
      ['u', userId, 'player', visit, 'them', id, 'summary', gameId] as const,
    ownAccounts: (userId: QueryUserId, visit: number) =>
      ['u', userId, 'player', visit, 'own', 'accounts'] as const,
    ownAvailability: (userId: QueryUserId, visit: number) =>
      ['u', userId, 'player', visit, 'own', 'availability'] as const,
  },
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
