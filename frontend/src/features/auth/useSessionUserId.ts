import { useAuthStore } from './authStore';

/**
 * Identificador del usuario de la sesión, o `null` si no hay sesión (spec 016, RF-9).
 *
 * Lo usan las claves de consulta (para no mezclar nunca datos de dos cuentas) y
 * `enabled` (para no pedir datos protegidos sin sesión). Solo repinta si cambia el id.
 */
export function useSessionUserId(): string | null {
  return useAuthStore((s) => (s.session.status === 'authenticated' ? s.session.user.id : null));
}
