import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { api, type LinkAccountPayload, type UpdateProfilePayload } from '@/services/api';
import type { GameAccount, GameId, TimeBlock } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';
import { useSessionUserId } from '@/features/auth/useSessionUserId';

/** Cuentas de juego vinculadas por el usuario autenticado. */
export function useAccounts() {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.accounts(userId),
    queryFn: () => api.profile.getAccounts(),
    enabled: userId !== null,
  });
}

/** Bloques de disponibilidad declarados. */
export function useAvailability() {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.availability(userId),
    queryFn: () => api.profile.getAvailability(),
    enabled: userId !== null,
  });
}

/**
 * Bloques de disponibilidad de otro jugador (spec 003, RF-12). Los usa "Proponer" (RF-29)
 * para distinguir "Este jugador no ha marcado horas" de "No tienen horas en común".
 *
 * La clave empieza por `['u', userId]` como las demás (HU-3). Se lee al montar cada fila.
 */
export function useAvailabilityOf(otherUserId: string) {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: ['u', userId, 'profile', 'availabilityOf', otherUserId] as const,
    queryFn: () => api.profile.getAvailabilityOf(otherUserId),
    enabled: userId !== null,
  });
}

/** Resumen de perfil para un juego: cuenta, rango, historial y últimas partidas. */
export function useGameSummary(gameId: GameId | null) {
  const userId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.gameSummary(userId, gameId ?? 'lol'),
    queryFn: () => api.profile.getGameSummary(gameId as GameId),
    enabled: userId !== null && gameId !== null,
  });
}

export function useSaveAvailability() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (blocks: TimeBlock[]) => api.profile.saveAvailability(blocks),
    onSuccess: (blocks) => {
      if (userId === null) return;
      queryClient.setQueryData(queryKeys.availability(userId), blocks);
      // Cambiar los horarios cambia los traslapes: las coincidencias caducan.
      queryClient.invalidateQueries({ queryKey: queryKeys.allMatches(userId) });
    },
  });
}

export function useLinkAccount() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (payload: LinkAccountPayload) => api.profile.linkAccount(payload),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gameSummary(userId, account.gameId) });
    },
  });
}

export function useUnlinkAccount() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (accountId: string) => api.profile.unlinkAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gameSummaries(userId) });
    },
  });
}

/** Relectura manual del rango desde la fuente externa del juego. */
export function useSyncAccount() {
  const queryClient = useQueryClient();
  const userId = useSessionUserId();

  return useMutation({
    mutationFn: (accountId: string) => api.profile.syncAccount(accountId),
    onSuccess: (account: GameAccount) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts(userId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.gameSummary(userId, account.gameId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allMatches(userId) });
    },
  });
}

export function useUpdateProfile() {
  const { setUser } = useAuth();

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) => api.profile.updateProfile(payload),
    onSuccess: (user) => setUser(user),
  });
}
