// Diferencia de rango desde la primera lectura (spec 007, RF-14). Función pura.

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
