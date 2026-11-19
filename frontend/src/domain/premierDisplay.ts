import type { GameAccount, Origin } from './types';

/**
 * Cómo se muestra el rango Premier de una cuenta de CS2 verificada con Steam (spec 015, RF-4,
 * RF-6, RF-7, RF-8, RF-12). Funciones puras: el servidor ya decide el estado de la cuenta
 * (`premierStatus`) y el origen de cada bloque; aquí solo se les da forma de texto o de enlace.
 */

/** Dirección pública de los perfiles de Leetify (D25). */
export const LEETIFY_PROFILE_BASE = 'https://leetify.com/app/profile/';

/** Enlace al perfil del jugador en Leetify a partir de su SteamID64 (RF-6, D25). */
export function leetifyProfileUrl(steamId: string): string {
  return `${LEETIFY_PROFILE_BASE}${encodeURIComponent(steamId)}`;
}

/** Página principal de Leetify: a ella enlaza el logo de la atribución (RF-6, RNF-8). */
export const LEETIFY_HOME_URL = 'https://leetify.com/';

/** Si el rango lo entrega Leetify, en cuyo caso va con su atribución y no con una etiqueta (RF-6). */
export function isLeetifyRank(origin: Origin): boolean {
  return origin === 'leetify';
}

/** Texto que va en lugar del rango cuando la cuenta no tiene rating (RF-7, RF-8); `null` con rating. */
export function premierStatusText(account: Pick<GameAccount, 'premierStatus'>): string | null {
  switch (account.premierStatus) {
    case 'unrated':
      return 'sin rango Premier';
    case 'unavailable':
      return 'rango no disponible';
    case undefined:
      return null;
  }
}

/** Texto que va en lugar del historial de una cuenta de CS2 verificada: Leetify solo da el rango vigente (RF-12, D27). */
export const LEETIFY_NO_HISTORY_TEXT = 'Leetify solo entrega el rango vigente: no hay historial';

/**
 * Si se muestra la cifra de distancia de rango entre dos cuentas (RF-25, D31): no se muestra
 * cuando cualquiera de los dos rangos es de Leetify, porque sería una métrica derivada de sus
 * datos. El servidor sigue usando la distancia para ordenar y filtrar (RF-5, D32).
 */
export function showsRankDistance(ownOrigin: Origin, otherOrigin: Origin): boolean {
  return !isLeetifyRank(ownOrigin) && !isLeetifyRank(otherOrigin);
}

/** Texto que va en lugar de la distancia cuando uno de los dos rangos es de Leetify (RF-25). */
export const LEETIFY_HIDDEN_DISTANCE_TEXT = 'la distancia no se muestra con rangos de Leetify';

/**
 * Etiqueta del puntaje de afinidad entre dos cuentas (RF-26, D33). El puntaje lo calcula la
 * plataforma: nunca se atribuye a Leetify. `'simulated'` si alguno de los dos rangos es simulado,
 * para que lo simulado siempre quede marcado; `null` (sin etiqueta) si los dos son de Leetify. Con
 * otros orígenes reales (Riot) se conserva el origen del candidato.
 */
export function scoreOriginLabel(ownOrigin: Origin, otherOrigin: Origin): Origin | null {
  if (ownOrigin === 'simulated' || otherOrigin === 'simulated') return 'simulated';
  return isLeetifyRank(otherOrigin) ? null : otherOrigin;
}
