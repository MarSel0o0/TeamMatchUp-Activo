import { ROUTES } from '@/app/routes';

/**
 * Aviso del resultado de la verificación con Riot Games (spec 014, RF-7, RF-27). Viaja en el
 * estado de navegación (`location.state`) al volver al perfil, no en la dirección.
 */
export interface RiotNotice {
  tone: 'ok' | 'error';
  text: string;
}

/** Lee el aviso del estado de navegación; cualquier otra forma no es un aviso. */
export function readRiotNotice(state: unknown): RiotNotice | null {
  if (typeof state !== 'object' || state === null) return null;
  const notice: unknown = Reflect.get(state, 'riotNotice');
  if (typeof notice !== 'object' || notice === null) return null;
  const tone: unknown = Reflect.get(notice, 'tone');
  const text: unknown = Reflect.get(notice, 'text');
  if ((tone !== 'ok' && tone !== 'error') || typeof text !== 'string' || text === '') return null;
  return { tone, text };
}

/**
 * Lee la ruta de regreso (`state.from`) guardada al entrar en `/verificar/riot` (spec 014, D99).
 * Solo acepta rutas internas distintas de `/verificar/riot`; en cualquier otro caso devuelve `/perfil`.
 */
export function readRiotReturnPath(state: unknown): string {
  if (typeof state !== 'object' || state === null) return ROUTES.profile;
  const from: unknown = Reflect.get(state, 'from');
  if (
    typeof from !== 'string' ||
    !from.startsWith('/') ||
    from.startsWith('//') ||
    from === ROUTES.riotVerify
  ) {
    return ROUTES.profile;
  }
  return from;
}
