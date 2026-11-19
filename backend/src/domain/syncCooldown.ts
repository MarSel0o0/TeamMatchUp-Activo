// Espera mínima entre resincronizaciones de una cuenta verificada (spec 012, RF-16, RF-18;
// plan, sección 2). Función pura: el instante llega como parámetro.

/** 5 minutos, contados desde la última resincronización exitosa (spec 012, Definiciones). */
export const SYNC_COOLDOWN_MS = 5 * 60 * 1000;

const MINUTE_MS = 60 * 1000;

export type CooldownResult = { allowed: true } | { allowed: false; minutes: number };

/**
 * Permite sincronizar si pasaron 5 minutos o más. Si no, devuelve los minutos que faltan
 * redondeados hacia arriba (nunca 0). Si `lastSyncedAt` es posterior a `now` (reloj atrasado)
 * no se bloquea al usuario. Con `null` (sin lectura que cuente, spec 013, RF-12) siempre permite.
 */
export function syncCooldown(lastSyncedAt: Date | null, now: Date): CooldownResult {
  // Spec 013, RF-12 y D6: `null` = la cuenta no tiene una lectura que cuente (verificada sin
  // perfil), así que no hay espera.
  if (lastSyncedAt === null) return { allowed: true };
  const elapsed = now.getTime() - lastSyncedAt.getTime();
  if (elapsed < 0 || elapsed >= SYNC_COOLDOWN_MS) return { allowed: true };
  return { allowed: false, minutes: Math.ceil((SYNC_COOLDOWN_MS - elapsed) / MINUTE_MS) };
}
