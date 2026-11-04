import { useCallback, useEffect } from 'react';
import { useMatch, useSearchParams } from 'react-router-dom';
import { PLAYER_TAB_PARAM, ROUTES } from '@/app/routes';
import { resolveTab } from '@/domain/playerSheet';
import type { Loadable } from '@/domain/playerSheet';
import type { GameId } from '@/domain/types';

export interface PlayerTab {
  /** Pestaña vigente; `null` mientras las cuentas no están cargadas o si no hay ninguna. */
  tab: GameId | null;
  /** Elige una pestaña y la deja en la dirección sin añadir una entrada al historial. */
  selectTab: (gameId: GameId) => void;
}

/**
 * Pestaña de la ficha en `?juego=` (spec 008, RF-5, RF-19, RF-20; plan 3.3).
 *
 * Con las cuentas cargadas aplica `resolveTab`: si la dirección pide un juego inexistente o
 * sin cuenta (o hay que quitarlo porque no hay cuentas), la corrige con `replace` (P14).
 * Elegir pestaña también usa `replace` (P13): "Atrás" no recorre pestañas. La pestaña
 * resuelta se devuelve ya en el mismo render, así nunca se pide el resumen de un juego sin
 * cuenta.
 *
 * Solo toca la dirección mientras la ruta vigente sigue siendo la ficha (P64): al salir, la
 * ficha saliente sigue montada durante la animación de `AnimatePresence` y no debe añadir
 * `?juego=` a la página de destino ni perder su `location.state`.
 */
export function usePlayerTab(accounts: Loadable<readonly { gameId: GameId }[]>): PlayerTab {
  const [searchParams, setSearchParams] = useSearchParams();
  const onPlayerRoute = useMatch(ROUTES.player) !== null;
  const requested = searchParams.get(PLAYER_TAB_PARAM);
  const resolution = accounts.state === 'ready' ? resolveTab(accounts.value, requested) : null;
  const tab = resolution?.tab ?? null;
  const mustReplace = resolution?.mustReplace ?? false;
  const urlGame = resolution?.urlGame ?? null;

  useEffect(() => {
    if (!onPlayerRoute || !mustReplace) return;
    setSearchParams(urlGame ? { [PLAYER_TAB_PARAM]: urlGame } : {}, { replace: true });
  }, [onPlayerRoute, mustReplace, urlGame, setSearchParams]);

  const selectTab = useCallback(
    (gameId: GameId) => {
      if (!onPlayerRoute || tab === null || gameId === tab) return;
      setSearchParams({ [PLAYER_TAB_PARAM]: gameId }, { replace: true });
    },
    [onPlayerRoute, tab, setSearchParams],
  );

  return { tab, selectTab };
}
