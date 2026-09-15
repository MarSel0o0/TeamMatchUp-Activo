import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import { api, type LinkAccountPayload, type UpdateProfilePayload } from '@/services/api';
import type { GameAccount, GameId, TimeBlock } from '@/domain/types';
import { useAuth } from '@/features/auth/useAuth';

/** Cuentas de juego vinculadas por el usuario autenticado. */
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => api.profile.getAccounts(),
  });
}

/** Bloques de disponibilidad declarados. */
export function useAvailability() {
  return useQuery({
    queryKey: queryKeys.availability,
    queryFn: () => api.profile.getAvailability(),
  });
}

/** Resumen de perfil para un juego: cuenta, rango, historial y últimas partidas. */
export function useGameSummary(gameId: GameId | null) {
  return useQuery({
    queryKey: queryKeys.gameSummary(gameId ?? 'lol'),
    queryFn: () => api.profile.getGameSummary(gameId as GameId),
    enabled: gameId !== null,
  });
}

export function useSaveAvailability() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blocks: TimeBlock[]) => api.profile.saveAvailability(blocks),
    onSuccess: (blocks) => {
      queryClient.setQueryData(queryKeys.availability, blocks);
      // Cambiar los horarios cambia los traslapes: las coincidencias caducan.
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useLinkAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LinkAccountPayload) => api.profile.linkAccount(payload),
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.gameSummary(account.gameId) });
    },
  });
}

export function useUnlinkAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => api.profile.unlinkAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: ['profile', 'summary'] });
    },
  });
}

/** Relectura manual del rango desde la fuente externa del juego. */
export function useSyncAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => api.profile.syncAccount(accountId),
    onSuccess: (account: GameAccount) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts });
      queryClient.invalidateQueries({ queryKey: queryKeys.gameSummary(account.gameId) });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
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
