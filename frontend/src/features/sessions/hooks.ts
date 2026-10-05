import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { api, type CreateSessionPayload } from '@/services/api';
import type { GameId } from '@/domain/types';

export function useSessions(gameId: GameId | 'all') {
  return useQuery({
    queryKey: queryKeys.sessions(gameId),
    queryFn: () => api.sessions.list(gameId),
    placeholderData: (previous) => previous,
  });
}

/** Invalida todas las listas de sesiones: cualquier filtro puede verse afectado. */
function useSessionMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });
}

export function useCreateSession() {
  return useSessionMutation((payload: CreateSessionPayload) => api.sessions.create(payload));
}

export function useJoinSession() {
  return useSessionMutation((sessionId: string) => api.sessions.join(sessionId));
}

export function useLeaveSession() {
  return useSessionMutation((sessionId: string) => api.sessions.leave(sessionId));
}

export function useCancelSession() {
  return useSessionMutation((sessionId: string) => api.sessions.cancel(sessionId));
}
