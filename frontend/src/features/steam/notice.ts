/**
 * Aviso del resultado de la verificación con Steam (spec 013, RF-4 a RF-9, RF-20). Viaja en el
 * estado de navegación (`location.state`) de la página de vuelta al perfil, no en la dirección:
 * una dirección con un aviso escrito permitiría a un tercero mostrar un éxito falso (plan, P13-18).
 * Dura hasta que el usuario sale del perfil y sobrevive a una recarga, porque el estado del
 * historial persiste.
 */
export interface SteamNotice {
  tone: 'ok' | 'error';
  text: string;
}

/** Lee el aviso del estado de navegación; cualquier otra forma no es un aviso. */
export function readSteamNotice(state: unknown): SteamNotice | null {
  if (typeof state !== 'object' || state === null) return null;
  const notice: unknown = Reflect.get(state, 'steamNotice');
  if (typeof notice !== 'object' || notice === null) return null;
  const tone: unknown = Reflect.get(notice, 'tone');
  const text: unknown = Reflect.get(notice, 'text');
  if ((tone !== 'ok' && tone !== 'error') || typeof text !== 'string' || text === '') return null;
  return { tone, text };
}
