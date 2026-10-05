import type { GameId, MatchFilters } from '@/domain/types';

/**
 * Claves de caché centralizadas.
 *
 * Tenerlas en un solo lugar evita invalidaciones que no coinciden por un typo y
 * documenta de un vistazo qué información cachea la aplicación.
 */
export const queryKeys = {
  currentUser: ['auth', 'me'] as const,
  accounts: ['profile', 'accounts'] as const,
  availability: ['profile', 'availability'] as const,
  gameSummary: (gameId: GameId) => ['profile', 'summary', gameId] as const,
  matches: (filters: MatchFilters) => ['matches', filters] as const,
  sessions: (gameId: GameId | 'all') => ['sessions', gameId] as const,
} as const;
