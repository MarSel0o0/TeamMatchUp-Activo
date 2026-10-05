import { useEffect } from 'react';

const TARGETS = '.sheet, .spot';

/**
 * Un solo listener para toda la aplicación: escribe la posición del puntero,
 * relativa al panel que está debajo, como variables CSS (`--mx`, `--my`). El
 * borde iluminado de `.sheet::after` las lee. No hay estado de React en juego,
 * así que mover el mouse no re-renderiza nada.
 */
export function PointerSpotlight() {
  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) return;

    let frame = 0;
    let last: PointerEvent | null = null;

    const paint = () => {
      frame = 0;
      if (!last) return;
      const target = (last.target as Element | null)?.closest?.(TARGETS) as HTMLElement | null;
      if (!target) return;
      const rect = target.getBoundingClientRect();
      target.style.setProperty('--mx', `${last.clientX - rect.left}px`);
      target.style.setProperty('--my', `${last.clientY - rect.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };

    document.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      document.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return null;
}
