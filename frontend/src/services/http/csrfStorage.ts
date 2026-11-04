import { STORAGE_KEYS } from '@/config/env';

/**
 * Único módulo que toca la clave del comprobante anti-CSRF (`tmu.csrf`).
 * Es el único valor de sesión que la interfaz guarda: la credencial viaja solo
 * en una cookie `HttpOnly` y el código de la página nunca la ve (RF-2, RF-3).
 *
 * - `tabCsrf` es el "comprobante de esta pestaña": el último que esta pestaña
 *   guardó al iniciar sesión o leyó del almacenamiento para enviarlo.
 * - `memoryCsrf` es el respaldo si el almacenamiento falla (modo privado o
 *   bloqueado): la sesión funciona hasta recargar.
 */
let tabCsrf: string | null = null;
let memoryCsrf: string | null = null;

/** Lee el valor guardado; si el almacenamiento falla, usa el respaldo en memoria. */
function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.csrf);
  } catch {
    return memoryCsrf;
  }
}

/** Comprobante para enviar en una petición (públicas o protegidas), o `null` si no hay. */
export function readCsrf(): string | null {
  const value = readStored();
  if (value !== null) tabCsrf = value;
  return value;
}

/** Guarda el comprobante recibido al iniciar sesión, reemplazando cualquier anterior. */
export function saveCsrf(value: string): void {
  tabCsrf = value;
  memoryCsrf = value;
  try {
    localStorage.setItem(STORAGE_KEYS.csrf, value);
  } catch {
    // Sin almacenamiento: queda solo en memoria, en esta pestaña.
  }
}

/**
 * Borra el comprobante solo si el guardado sigue siendo el de esta pestaña. Si
 * otra pestaña ya lo reemplazó o lo borró, no toca el almacenamiento.
 */
export function clearCsrfIfOwn(): void {
  if (tabCsrf === null) return;
  if (readStored() === tabCsrf) {
    try {
      localStorage.removeItem(STORAGE_KEYS.csrf);
    } catch {
      // Sin almacenamiento: el respaldo en memoria se limpia abajo.
    }
  }
  memoryCsrf = null;
  tabCsrf = null;
}
