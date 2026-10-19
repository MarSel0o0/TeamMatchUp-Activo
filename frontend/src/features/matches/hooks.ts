import { useQuery } from '@tanstack/react-query';
import { keepPreviousForUser, queryKeys } from '@/app/providers/queryKeys';
import { api } from '@/services/api';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import type { MatchFilters } from '@/domain/types';

/**
 * Coincidencias para el juego y los filtros actuales.
 *
 * `placeholderData` mantiene en pantalla el resultado anterior mientras llega
 * el nuevo, de modo que mover un filtro no hace parpadear la lista; solo lo hace
 * con datos del mismo usuario (HU-3).
 */
export function useMatches(filters: MatchFilters, enabled: boolean) {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.matches(userId, filters),
    queryFn: () => api.matches.list(filters),
    enabled: userId !== null && enabled,
    placeholderData: keepPreviousForUser(userId),
  });
}
