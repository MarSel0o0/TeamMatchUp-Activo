/**
 * Decide si la interfaz usa el backend simulado (RF-1).
 *
 * Solo vale `true` el texto exacto `true` (tras quitar espacios en los extremos).
 * `TRUE`, `1`, vacío y ausente dejan el servidor real. Sin imports, para poder
 * ejecutarla directamente con Node en la comprobación de la tarea.
 */
export function isMockEnabled(raw: string | undefined): boolean {
  return raw?.trim() === 'true';
}
