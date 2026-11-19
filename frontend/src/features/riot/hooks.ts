import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { env } from '@/config/env';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import { api, type CreateRiotChallengePayload } from '@/services/api';
import { getDdragonVersion } from '@/services/ddragon';

/** La instancia debe responder una vez; durante cinco minutos no se vuelve a preguntar. */
const AVAILABILITY_STALE_MS = 5 * 60 * 1000;

/**
 * ¿Ofrecer «Verificar con Riot Games»? (spec 014, RF-38, RF-42). La interfaz pregunta al servidor
 * si tiene clave de Riot. En modo simulado no se pregunta (el botón sale desactivado). Mientras no
 * hay respuesta, o si falla, no hay `data` y el botón no se muestra.
 */
export function useRiotAvailability() {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.riotStatus(userId),
    queryFn: () => api.riot.status(),
    enabled: userId !== null && !env.useMockApi,
    staleTime: AVAILABILITY_STALE_MS,
    retry: false,
  });
}

/**
 * Recupera el desafío abierto del usuario autenticado (spec 014, RF-45, D100, D101, D103).
 * Siempre lee estado fresco al montar para obtener `remainingSeconds` actualizado, y no recarga
 * al volver el foco de la ventana (el jugador cambia al cliente de LoL y vuelve).
 */
export function useCurrentRiotChallenge(enabled = true) {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.riotChallenge(userId),
    queryFn: () => api.riot.currentChallenge(),
    enabled: userId !== null && enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** Pide un desafío nuevo con ícono de inicio para un Riot ID y una región (spec 014, RF-1, RF-54). */
export function useCreateRiotChallenge() {
  return useMutation({
    mutationFn: (payload: CreateRiotChallengePayload) => api.riot.createChallenge(payload),
  });
}

/**
 * Confirma el desafío de verificación con Riot Games (spec 014, RF-7, RF-27).
 * Al verificar, invalida cuentas, resumen de LoL y coincidencias del usuario.
 */
export function useConfirmRiotChallenge() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (challengeId: string) => api.riot.confirmChallenge(challengeId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.gameSummary(userId, 'lol') });
      void queryClient.invalidateQueries({ queryKey: queryKeys.allMatches(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.riotChallenge(userId) });
    },
  });
}

/**
 * Versión más reciente de Data Dragon para los íconos de invocador de LoL (spec 014, D93, O-3).
 * Lee a través de `services/ddragon.ts` (constitución, principio 3) y se mantiene en caché toda la sesión.
 */
export function useDdragonVersion() {
  return useQuery({
    queryKey: queryKeys.ddragonVersion,
    queryFn: () => getDdragonVersion(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
}
