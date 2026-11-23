import type { MantineColorsTuple } from '@mantine/core';

/**
 * Paletas de la librería hechas solo de referencias a tokens de `styles/tokens.css` (spec 017, RF-2,
 * DT-2). La interfaz no pinta con ninguna de ellas (cada componente migrado toma sus colores de los
 * tokens en su CSS); existen para que **ningún color literal por defecto de la librería llegue al DOM**.
 * Como los tokens cambian con `data-theme`, una misma paleta vale para los dos temas.
 */
function palette(...tokens: [string, string, string, string, string, string, string, string, string, string]): MantineColorsTuple {
  return tokens.map((token) => `var(${token})`) as unknown as MantineColorsTuple;
}

function flat(token: string): MantineColorsTuple {
  return palette(token, token, token, token, token, token, token, token, token, token);
}

/** El acento de la interfaz: lo que el jugador hace. `primaryShade: 6` (el volt de cada tema). */
const volt = palette(
  '--volt-wash',
  '--volt-wash',
  '--volt-wash-strong',
  '--volt-edge',
  '--volt',
  '--volt',
  '--volt',
  '--volt-bright',
  '--accent-text',
  '--accent-text-hover',
);

/** Neutros: de la tinta a los fondos. */
const neutral = palette(
  '--ink',
  '--ink-2',
  '--ink-3',
  '--placeholder',
  '--line-strong',
  '--line',
  '--fill-3',
  '--fill-2',
  '--surface-sunk',
  '--bg-deep',
);

/** Los nombres de color de la librería (los que trae `DEFAULT_THEME`) más `volt`. */
export const tokenPalettes: Record<string, MantineColorsTuple> = {
  volt,
  dark: neutral,
  gray: neutral,
  red: flat('--danger'),
  green: flat('--ok'),
  yellow: flat('--warn'),
  orange: flat('--warn'),
  pink: flat('--ink-3'),
  grape: flat('--ink-3'),
  violet: flat('--ink-3'),
  indigo: flat('--ink-3'),
  blue: flat('--ink-3'),
  cyan: flat('--ink-3'),
  lime: flat('--volt'),
  teal: flat('--ok'),
};
