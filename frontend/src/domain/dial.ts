/**
 * Reglas puras de los deslizadores de coincidencias (spec 017, RF-11; plan 5.3). Sin React, sin DOM
 * y sin reloj.
 */
export interface DialRange {
  min: number;
  max: number;
  step: number;
}

/**
 * Nombre accesible de un deslizador: el texto de su etiqueta visible con el valor y la unidad, como
 * lo calcula hoy el navegador («Diferencia máxima de rango 25 pts»). Cambia con el valor.
 */
export function dialName(label: string, value: number, unit: string): string {
  return `${label} ${value} ${unit}`;
}

/**
 * Valor que deja Re Pág o Av Pág, o `null` si la tecla no es ninguna de las dos. El salto es el mayor
 * entre un décimo del rango y el paso; el resultado se ajusta al múltiplo de paso más cercano desde el
 * mínimo y se acota al rango. Coincide con las 24 mediciones de la línea base (T2, Chrome 159): de 25 en
 * 0–50 de 5 en 5 deja 30 y 20; de 4 en 0–12 de 1 en 1 deja 5 y 3.
 */
export function pageStepValue(key: string, value: number, range: DialRange): number | null {
  if (key !== 'PageUp' && key !== 'PageDown') return null;
  const { min, max, step } = range;
  const big = Math.max((max - min) / 10, step);
  const raw = key === 'PageUp' ? value + big : value - big;
  const snapped = min + Math.round((raw - min) / step) * step;
  return Math.min(max, Math.max(min, snapped));
}
