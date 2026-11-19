import { useMutation, useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { env } from '@/config/env';
import { isSteamLoginUrl } from '@/domain/steamLogin';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import { api } from '@/services/api';

/** La instancia debe responder una vez; durante cinco minutos no se vuelve a preguntar. */
const AVAILABILITY_STALE_MS = 5 * 60 * 1000;

/**
 * ¿Ofrecer «Verificar con Steam»? (spec 013, RF-22). La interfaz no sabe si el servidor tiene la
 * clave de Steam: se lo pregunta. En modo simulado no se pregunta (RF-21: el botón sale
 * desactivado). Mientras no hay respuesta, o si falla, no hay `data` y el botón no se muestra.
 */
export function useSteamAvailability() {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.steamStatus(userId),
    queryFn: () => api.steam.status(),
    enabled: userId !== null && !env.useMockApi,
    staleTime: AVAILABILITY_STALE_MS,
    retry: false,
  });
}

/**
 * Abre el intento y lleva al usuario a la página de inicio de sesión de Steam (RF-1). Solo
 * navega si la dirección es la oficial de Steam; si no, es un error y no pasa nada.
 */
export function useStartSteamVerification() {
  return useMutation({
    mutationFn: async () => {
      const { url } = await api.steam.start();
      if (!isSteamLoginUrl(url)) throw new Error('dirección de inicio de sesión no válida');
      window.location.assign(url);
    },
  });
}
