import type { Origin, SourceId } from './types';

/**
 * Textos de origen de los datos de una cuenta (spec 012, RF-6, RF-7). Funciones puras: el
 * origen de cada bloque lo calcula el servidor (`blockOrigins`) y aquí solo se rotula.
 */

/** Etiqueta de un bloque: "Datos de demostración" o el nombre de su fuente real. */
export function originLabel(origin: Origin): string {
  switch (origin) {
    case 'simulated':
      return 'Datos de demostración';
    case 'steam':
      return 'Datos de Steam';
    case 'riot':
      return 'Datos de Riot Games';
    case 'leetify':
      return 'Datos de Leetify';
  }
}

/** Marca de la cuenta: con qué fuente se verificó, o "Sin verificar" si no tiene fuente. */
export function verifiedLabel(source?: SourceId): string {
  switch (source) {
    case undefined:
      return 'Sin verificar';
    case 'steam':
      return 'Verificada con Steam';
    case 'riot':
      return 'Verificada con Riot Games';
  }
}
