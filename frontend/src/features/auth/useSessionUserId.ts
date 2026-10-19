import { useAuth } from './useAuth';

/**
 * Identificador del usuario de la sesión, o `null` si no hay sesión (HU-3, RF-5).
 *
 * Lo usan las claves de consulta (para no mezclar nunca datos de dos cuentas) y
 * `enabled` (para no pedir datos protegidos sin sesión).
 */
export function useSessionUserId(): string | null {
  return useAuth().user?.id ?? null;
}
