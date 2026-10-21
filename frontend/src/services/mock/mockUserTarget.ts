// Destino de las operaciones de otro jugador en el backend simulado (spec 008, RF-11, RF-15;
// P22, P49). Sin imports, para comprobarlo directo con Node.

/** Forma de los identificadores del simulado, sin distinguir mayúsculas. */
export const MOCK_USER_ID_PATTERN = /^user-[0-9]+$/i;

/**
 * `me` (solo el texto exacto) → la sesión; `user-<dígitos>` sin distinguir mayúsculas → ese
 * identificador en minúsculas (`own` si coincide con la sesión); cualquier otra forma →
 * `{ ok: false }` (el 400 de "id con formato inválido"). La existencia la comprueba quien llama.
 */
export function resolveMockUserTarget(
  raw: string,
  sessionUserId: string,
): { ok: true; id: string; own: boolean } | { ok: false } {
  if (raw === 'me') return { ok: true, id: sessionUserId, own: true };
  if (!MOCK_USER_ID_PATTERN.test(raw)) return { ok: false };
  const id = raw.toLowerCase();
  return { ok: true, id, own: id === sessionUserId.toLowerCase() };
}
