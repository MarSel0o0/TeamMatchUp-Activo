// Bloqueo por usuario en memoria para las operaciones con Riot Games (spec 014, RF-25, RF-28,
// RF-49, RF-51; D63, D90; plan, §2.2 y P14-2).
// - Cada instancia de `createApp` crea su propio bloqueo (aislamiento entre pruebas y reinicios).
// - Se pierde al reiniciar el servidor por diseño (D63).
// - Compartido entre `/api/riot` (pedir y confirmar) y `/api/accounts/:id/sync` (resincronizar).

export interface RiotUserLock {
  /** Intenta tomar el bloqueo para `userId`; devuelve `false` si ya tiene una operación en curso. */
  tryAcquire(userId: string): boolean;
  /** Libera el bloqueo de `userId` (idempotente). */
  release(userId: string): void;
}

/** Crea un bloqueo por usuario aislado a la instancia en memoria (P14-2). */
export function createRiotUserLock(): RiotUserLock {
  const active = new Set<string>();
  return {
    tryAcquire(userId) {
      if (active.has(userId)) return false;
      active.add(userId);
      return true;
    },
    release(userId) {
      active.delete(userId);
    },
  };
}
