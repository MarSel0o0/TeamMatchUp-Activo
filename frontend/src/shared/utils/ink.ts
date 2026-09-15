/**
 * Mezcla una tinta hexadecimal con transparencia.
 *
 * Permite que la tinta de un juego bañe una superficie entera —el bloque de una
 * sesión en la reja— en vez de marcarla con una banda lateral de color, que es
 * el recurso que el mundo de la hoja no usa.
 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value;

  const red = Number.parseInt(full.slice(0, 2), 16);
  const green = Number.parseInt(full.slice(2, 4), 16);
  const blue = Number.parseInt(full.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
