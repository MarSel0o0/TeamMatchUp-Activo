/**
 * Identificador de sesión del backend simulado (spec 009, RF-16; plan 4.6). Sin imports: se
 * carga directo en las comprobaciones con Node. Las sesiones de la semilla y las que crea el
 * modo simulado son `session-<número>`; la dirección puede traerlas en mayúsculas.
 */
export const MOCK_SESSION_ID_PATTERN = /^session-[0-9]+$/i;

/** El identificador en minúsculas, o `null` si no tiene el formato (el servidor responde 400). */
export function resolveMockSessionId(raw: string): string | null {
  return MOCK_SESSION_ID_PATTERN.test(raw) ? raw.toLowerCase() : null;
}
