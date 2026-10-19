/**
 * Lectura del mensaje de un error del servidor (RF-9). Sin imports, para poder
 * ejecutarla con Node en la comprobación de la tarea.
 *
 * Un error con mensaje es una respuesta no exitosa cuyo cuerpo es JSON con el
 * campo `error` (spec 001, RF-7) como texto no vacío. Cualquier otra cosa
 * (cuerpo vacío, HTML del servidor de desarrollo, JSON sin `error` o con un
 * valor que no es texto) es un error sin mensaje y devuelve `null`.
 */
export function readErrorMessage(bodyText: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const value = (parsed as Record<string, unknown>).error;
  return typeof value === 'string' && value !== '' ? value : null;
}
