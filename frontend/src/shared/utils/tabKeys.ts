// Teclado del patrón de pestañas (spec 008, RNF-2). Función pura, sin imports.

/**
 * Índice de la pestaña que recibe el foco: ArrowRight y ArrowLeft circulares, Home → 0,
 * End → `count - 1`; cualquier otra tecla → `null` (no se mueve).
 */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  switch (key) {
    case 'ArrowRight':
      return (current + 1) % count;
    case 'ArrowLeft':
      return (current - 1 + count) % count;
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    default:
      return null;
  }
}
