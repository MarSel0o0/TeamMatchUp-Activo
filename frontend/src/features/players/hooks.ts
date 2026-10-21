import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { queryKeys } from '@/app/providers/queryKeys';
import type { Loadable } from '@/domain/playerSheet';
import type { GameId } from '@/domain/types';
import { useSessionUserId } from '@/features/auth/useSessionUserId';
import { api, ApiError } from '@/services/api';

/**
 * Consultas de la ficha de jugador (spec 008, plan 3.6 y 3.7).
 *
 * RF-26: las 6 consultas usan una clave por visita, `staleTime: Infinity` y
 * `refetchOnMount: false`; ninguna se refresca sola (los globales de la 007 ya quitan
 * reintentos, foco y reconexión). Las únicas peticiones fuera de abrir la ficha son el
 * `refetch()` de "Reintentar" y el de RF-19.
 *
 * P55: todas con `enabled: sessionUserId !== null && !own`. La condición de sesión es la de la
 * corrección D-A2 de la T31 de la 007 (`clearClientSession` pone el usuario a `null` con
 * `flushSync` antes de cancelar, y así las consultas montadas quedan deshabilitadas). `own`
 * es la ficha propia (RF-15): la página redirige al perfil sin pedir nada.
 */
const SHEET_QUERY_OPTIONS = {
  staleTime: Infinity,
  refetchOnMount: false,
} as const;

let visitCounter = 0;

/** RF-26: visita nueva en cada montaje de la ficha (abrir, volver con "Atrás", recargar). */
export function usePlayerVisit(): number {
  const [visit] = useState(() => {
    visitCounter += 1;
    return visitCounter;
  });
  return visit;
}

/** Datos públicos del jugador (RF-3, RF-9). */
export function usePlayer(visit: number, id: string, own: boolean) {
  const sessionUserId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.player.user(sessionUserId, visit, id),
    queryFn: () => api.users.get(id),
    ...SHEET_QUERY_OPTIONS,
    enabled: sessionUserId !== null && !own,
  });
}

/** Cuentas de juego del jugador (RF-4, RF-10). */
export function usePlayerAccounts(visit: number, id: string, own: boolean) {
  const sessionUserId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.player.accounts(sessionUserId, visit, id),
    queryFn: () => api.users.listAccounts(id),
    ...SHEET_QUERY_OPTIONS,
    enabled: sessionUserId !== null && !own,
  });
}

/** Horas marcadas por el jugador (RF-6, RF-7). */
export function usePlayerAvailability(visit: number, id: string, own: boolean) {
  const sessionUserId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.player.availability(sessionUserId, visit, id),
    queryFn: () => api.profile.getAvailabilityOf(id),
    ...SHEET_QUERY_OPTIONS,
    enabled: sessionUserId !== null && !own,
  });
}

/**
 * Resumen del juego de la pestaña (RF-4, RF-16). `tab` lo da `usePlayerTab`, que solo
 * devuelve un juego con las cuentas del jugador ya cargadas (plan 3.3): sin cuentas cargadas
 * `tab` es `null` y el resumen no se pide, así un `?juego=` sin cuenta nunca da un 404 que
 * active RF-19.
 */
export function usePlayerSummary(visit: number, id: string, tab: GameId | null, own: boolean) {
  const sessionUserId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.player.summary(sessionUserId, visit, id, tab ?? 'lol'),
    queryFn: () => api.users.getGameSummary(id, tab as GameId),
    ...SHEET_QUERY_OPTIONS,
    enabled: sessionUserId !== null && !own && tab !== null,
  });
}

/**
 * Cuentas del usuario de la sesión, propias de la ficha (plan 5): no comparten la caché de
 * `useAccounts`, para no decidir la distancia ni el motivo 2 con datos de antes (RF-23).
 */
export function useOwnAccountsForSheet(visit: number, own: boolean) {
  const sessionUserId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.player.ownAccounts(sessionUserId, visit),
    queryFn: () => api.profile.getAccounts(),
    ...SHEET_QUERY_OPTIONS,
    enabled: sessionUserId !== null && !own,
  });
}

/** Horas del usuario de la sesión, propias de la ficha (plan 5; RF-6, RF-7, RF-23). */
export function useOwnAvailabilityForSheet(visit: number, own: boolean) {
  const sessionUserId = useSessionUserId();
  return useQuery({
    queryKey: queryKeys.player.ownAvailability(sessionUserId, visit),
    queryFn: () => api.profile.getAvailability(),
    ...SHEET_QUERY_OPTIONS,
    enabled: sessionUserId !== null && !own,
  });
}

/** `Loadable` con el código de la respuesta de error (`null` si no hay error o no es `ApiError`). */
export type SheetLoadable<T> = Loadable<T> & { errorStatus: number | null };

/** Código HTTP de un error de consulta: `ApiError.status` (0 = sin respuesta, RF-24). */
export function errorStatusOf(error: unknown): number | null {
  return error instanceof ApiError ? error.status : null;
}

/**
 * Traduce una consulta al estado que leen las funciones puras (RF-8, RF-18, RF-24).
 * - Con datos → `ready` (también durante un `refetch()`: RF-19 conserva las pestañas).
 * - En error y sin volver a pedir → `failed`, con `errorStatus` de `ApiError.status`; el
 *   estado 0 (plazo de 30 s o sin conexión) también es `failed` (RF-24).
 * - Lo demás (pendiente, deshabilitada o "Reintentar" en curso) → `loading`.
 */
export function toLoadable<T>(query: UseQueryResult<T>): SheetLoadable<T> {
  if (query.status === 'success') return { state: 'ready', value: query.data, errorStatus: null };
  if (query.status === 'error' && !query.isFetching) {
    return { state: 'failed', errorStatus: errorStatusOf(query.error) };
  }
  return { state: 'loading', errorStatus: null };
}
