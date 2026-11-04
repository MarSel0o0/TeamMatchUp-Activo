import { useState } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { keepPreviousForUser, queryKeys } from '@/app/providers/queryKeys';
import { api, type CreateSessionPayload, type SessionEditPayload } from '@/services/api';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import type { GameId, PlaySession } from '@/domain/types';
import { applySessionToAgenda, markAgendaStale, removeSessionFromAgenda } from './agendaCache';

export function useSessions(gameId: GameId | 'all') {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.sessions(userId, gameId),
    queryFn: () => api.sessions.list(gameId),
    enabled: userId !== null,
    placeholderData: keepPreviousForUser(userId),
  });
}

/** Una sola visita por montaje de la página de detalle (plan 4.1). */
let visitCounter = 0;

export function useSessionVisit(): number {
  const [visit] = useState(() => {
    visitCounter += 1;
    return visitCounter;
  });
  return visit;
}

/**
 * Detalle de una sesión (spec 009, RF-1, RF-17): clave propia por visita, sin `initialData` de la
 * agenda, y sin lecturas por foco, reconexión ni montaje; solo se pide al abrir o con «Reintentar».
 */
export function useSessionDetail(rawId: string, visit: number) {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.sessionDetail(userId, visit, rawId),
    queryFn: () => api.sessions.get(rawId),
    enabled: userId !== null,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/** Nueva lectura manual tras un rechazo (RF-21): sin estado de carga. */
export function rereadSession(rawId: string): Promise<PlaySession> {
  return api.sessions.get(rawId);
}

/**
 * Escritura sobre una sesión. El efecto en la agenda va en el `onSuccess` del propio
 * `useMutation`, que se ejecuta aunque la vista que la lanzó ya no esté montada (R16).
 */
function useSessionMutation<TVariables, TData>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  onDone: (queryClient: QueryClient, userId: string | null, data: TData, variables: TVariables) => void,
) {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => onDone(queryClient, userId, data, variables),
  });
}

export function useCreateSession() {
  return useSessionMutation(
    (payload: CreateSessionPayload) => api.sessions.create(payload),
    (queryClient, userId) => markAgendaStale(queryClient, userId),
  );
}

export function useUpdateSession() {
  return useSessionMutation(
    (variables: { sessionId: string; payload: SessionEditPayload }) =>
      api.sessions.update(variables.sessionId, variables.payload),
    (queryClient, userId, session) => applySessionToAgenda(queryClient, userId, session),
  );
}

export function useJoinSession() {
  return useSessionMutation(
    (sessionId: string) => api.sessions.join(sessionId),
    (queryClient, userId, session) => applySessionToAgenda(queryClient, userId, session),
  );
}

export function useLeaveSession() {
  return useSessionMutation(
    (sessionId: string) => api.sessions.leave(sessionId),
    (queryClient, userId, session) => applySessionToAgenda(queryClient, userId, session),
  );
}

export function useCancelSession() {
  return useSessionMutation(
    (sessionId: string) => api.sessions.cancel(sessionId),
    (queryClient, userId, _data, sessionId) => removeSessionFromAgenda(queryClient, userId, sessionId),
  );
}
