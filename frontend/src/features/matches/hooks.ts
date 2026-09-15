import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { api } from '@/services/api';
import type { MatchFilters } from '@/domain/types';

/**
 * Coincidencias para el juego y los filtros actuales.
 *
 * `placeholderData` mantiene en pantalla el resultado anterior mientras llega
 * el nuevo, de modo que mover un filtro no hace parpadear la lista.
 */
export function useMatches(filters: MatchFilters, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.matches(filters),
    queryFn: () => api.matches.list(filters),
    enabled,
    placeholderData: (previous) => previous,
  });
}
