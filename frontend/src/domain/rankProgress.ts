// Diferencia de rango desde la primera lectura (spec 007, RF-14; spec 008, RF-4 y RF-17).
// Funciones puras.

import { NO_DATA_TEXT } from '@/shared/utils/copy';

/**
 * Diferencia normalizada entre la lectura vigente y la primera del historial
 * (`rankHistory[0]`), sin suponer que el último elemento del historial es el vigente.
 * `null` si la cuenta no trae historial: la interfaz muestra "Sin datos" (RF-14, caso
 * defensivo).
 */
export function rankGainSinceFirst(account: {
  currentRank: { normalized: number };
  rankHistory: readonly { normalized: number }[];
}): number | null {
  const first = account.rankHistory[0];
  if (first === undefined) return null;
  return account.currentRank.normalized - first.normalized;
}

/**
 * Texto de la diferencia desde la primera lectura, el mismo en perfil y ficha (spec 008,
 * RF-4 y RF-17; P36, P39, P41): `gain >= 0` (incluido 0) → "▲ +n pts desde la primera
 * lectura"; `gain < 0` → "▼ −n pts desde la primera lectura", con el signo menos U+2212;
 * `null` → `NO_DATA_TEXT` (P62).
 */
export function formatRankGain(gain: number | null): string {
  if (gain === null) return NO_DATA_TEXT;
  if (gain >= 0) return `▲ +${gain} pts desde la primera lectura`;
  return `▼ \u2212${Math.abs(gain)} pts desde la primera lectura`;
}
