import { originLabel } from '@/domain/origins';
import type { Origin } from '@/domain/types';

/**
 * Etiqueta de origen de un bloque de datos (spec 012, RF-6): "Datos de demostración" o el
 * nombre de la fuente real. Mismo aspecto que `DemoTag`, que queda para el aviso general.
 */
export function OriginTag({ origin, className }: { origin: Origin; className?: string }) {
  const classes = className ? `note note--faint ${className}` : 'note note--faint';
  return <span className={classes}>{originLabel(origin)}</span>;
}
