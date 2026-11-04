import { STORAGE_KEYS } from '@/config/env';

/**
 * Aviso de cambio de sesión entre pestañas (RF-24; plan 3.7). Sin React.
 *
 * Usa una señal propia, distinta del comprobante anti-CSRF: solo la escriben el
 * inicio de sesión correcto y el cierre de sesión. Las limpiezas por RF-5 y RF-7
 * no la escriben (D2), por lo que las otras pestañas no reaccionan a ellas.
 *
 * No usa `BroadcastChannel`: sin almacenamiento no hay aviso entre pestañas
 * (RF-3), y un segundo canal contradiría esa regla.
 */
export type SessionChangeKind = 'login' | 'logout';

/** Intervalo de la red de seguridad; con el evento `storage` basta en primer plano. */
const POLL_MS = 2000;

/** Último valor de la señal visto por esta pestaña (incluidos sus propios avisos). */
let lastSeen: string | null = null;
/** Falso si el almacenamiento no deja escribir: entonces no se vigila. */
let storageUsable = true;
let counter = 0;

function readSignal(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.sessionSignal);
  } catch {
    return null;
  }
}

function uniqueId(): string {
  counter += 1;
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${counter}-${random}`;
}

/**
 * Avisa a las otras pestañas de un inicio o cierre de sesión. Se llama después de
 * guardar (inicio) o borrar (cierre) el comprobante propio. Si el almacenamiento
 * falla, no hay aviso ni vigilancia.
 */
export function announce(kind: SessionChangeKind): void {
  const value = `${kind}:${uniqueId()}`;
  try {
    localStorage.setItem(STORAGE_KEYS.sessionSignal, value);
    lastSeen = value;
  } catch {
    storageUsable = false;
  }
}

/** Comprueba que el almacenamiento se puede leer y escribir (sin dejar rastro). */
function canUseStorage(): boolean {
  try {
    localStorage.getItem(STORAGE_KEYS.sessionSignal);
    const probe = `${STORAGE_KEYS.sessionSignal}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/**
 * Empieza a vigilar la señal; llama a `onChange` cuando otra pestaña la cambia.
 * Devuelve la función que deja de vigilar. Sin almacenamiento disponible no
 * vigila (RF-3).
 *
 * Como máximo 5 s de retraso: el evento `storage` llega al instante en primer
 * plano; el intervalo de 2 s es la red de seguridad; y al volver a ser visible
 * (`visibilitychange`, `focus`, `pageshow`) se comprueba en el acto, porque una
 * pestaña en segundo plano o suspendida puede no recibir el evento.
 */
export function startWatching(onChange: () => void): () => void {
  storageUsable = canUseStorage();
  if (!storageUsable) return () => undefined;

  // Línea base al cargar la pestaña: lo que ya estaba escrito no es un cambio.
  lastSeen = readSignal();

  const check = () => {
    if (!storageUsable) return;
    const value = readSignal();
    if (value !== null && value !== lastSeen) {
      lastSeen = value;
      onChange();
    }
  };

  const onStorage = (event: StorageEvent) => {
    // `key` es `null` cuando se vacía todo el almacenamiento.
    if (event.key === null || event.key === STORAGE_KEYS.sessionSignal) check();
  };
  const onVisibility = () => {
    if (document.visibilityState === 'visible') check();
  };

  const timer = window.setInterval(check, POLL_MS);
  window.addEventListener('storage', onStorage);
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', onVisibility);

  return () => {
    window.clearInterval(timer);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('focus', check);
    window.removeEventListener('pageshow', check);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}
