// Bloqueo por cuenta en memoria para resincronizar CS2 (spec 015, RF-19, RNF-7; D21; plan, §2 y
// P15-6). Mismo patrón que `riotUserLock.ts`:
// - Cada instancia de `createApp` crea el suyo (aislamiento entre pruebas y reinicios).
// - Se pierde al reiniciar el servidor sin consecuencias: la instancia es única.
// - Es por cuenta, no por usuario: resincronizar CS2 nunca bloquea un desafío de Riot.

export interface AccountLock {
  /** Intenta tomar el bloqueo de `accountId`; `false` si ya hay una resincronización en curso. */
  tryAcquire(accountId: string): boolean;
  /** Libera el bloqueo de `accountId` (idempotente). */
  release(accountId: string): void;
}

/** Crea un bloqueo por cuenta aislado a la instancia, en memoria (P15-6). */
export function createAccountLock(): AccountLock {
  const active = new Set<string>();
  return {
    tryAcquire(accountId) {
      if (active.has(accountId)) return false;
      active.add(accountId);
      return true;
    },
    release(accountId) {
      active.delete(accountId);
    },
  };
}
