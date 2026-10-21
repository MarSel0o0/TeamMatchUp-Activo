import { useEffect, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { GameId } from '@/domain/types';
import { errorStatusOf } from './hooks';

/**
 * Flujo de RF-19 (spec 008, plan 3.4): ante un 404 del resumen del juego de la pestaña, la
 * ficha vuelve a pedir el usuario y sus cuentas, espera las dos respuestas (P47) y deja que
 * el render siguiente decida con las funciones puras (RF-9, RF-10, RF-18, RF-20).
 *
 * - Solo reacciona al 404; cualquier otro error del resumen es RF-18 normal.
 * - Reacciona una sola vez por error (`${tab}:${errorUpdatedAt}`): si tras repedir la
 *   pestaña sigue existiendo, el 404 queda expuesto como error de RF-18 con "Reintentar" y
 *   no se pide nada más (Pregunta 3 del plan). Un "Reintentar" que vuelva a dar 404 es otro
 *   error (otro `errorUpdatedAt`) y repite el flujo una vez.
 * - `rechecking` vale `true` desde el mismo render en que llega el 404 hasta que llegan las
 *   dos respuestas: la sección de juego y la distancia muestran carga (RF-8), nunca el error.
 *   Las pestañas no cambian mientras tanto (el `refetch()` conserva las cuentas previas).
 */
export function useSummaryRecheck(
  summary: UseQueryResult<unknown>,
  user: UseQueryResult<unknown>,
  accounts: UseQueryResult<unknown>,
  tab: GameId | null,
): { rechecking: boolean } {
  const [handled, setHandled] = useState<ReadonlySet<string>>(() => new Set());
  const [running, setRunning] = useState(false);

  const key =
    tab !== null &&
    summary.status === 'error' &&
    !summary.isFetching &&
    errorStatusOf(summary.error) === 404
      ? `${tab}:${summary.errorUpdatedAt}`
      : null;
  const pending = key !== null && !handled.has(key);

  const refetchUser = user.refetch;
  const refetchAccounts = accounts.refetch;

  useEffect(() => {
    if (!pending || key === null) return;
    setHandled((previous) => new Set(previous).add(key));
    setRunning(true);
    void Promise.all([refetchUser(), refetchAccounts()]).finally(() => setRunning(false));
  }, [pending, key, refetchUser, refetchAccounts]);

  return { rechecking: running || pending };
}
