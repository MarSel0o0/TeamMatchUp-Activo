/**
 * Bus mínimo, sin React, para avisar de un 401 en una operación protegida (RF-7).
 * Lo emite el transporte con la época de la sesión del cliente en que salió la
 * petición; lo atiende `AuthProvider`, que ignora las épocas viejas.
 */
export type UnauthorizedHandler = (epoch: number) => void;

const handlers = new Set<UnauthorizedHandler>();

/** Suscribe un manejador; devuelve la función que lo retira. */
export function onUnauthorized(handler: UnauthorizedHandler): () => void {
  handlers.add(handler);
  return () => {
    handlers.delete(handler);
  };
}

export function emitUnauthorized(epoch: number): void {
  for (const handler of [...handlers]) handler(epoch);
}
