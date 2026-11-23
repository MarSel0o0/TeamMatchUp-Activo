import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GAME_LIST } from './games';

/**
 * Spec 017, RF-2, RF-14; plan 3.2 y DT-13. El catálogo guarda la tinta de cada juego (`accent`) y la
 * interfaz migrada la pinta con un token: la prueba exige que cada juego tenga su token, con el mismo
 * valor, en los dos temas. Añadir un juego sin su token hace fallar esta prueba.
 */
const tokensCss = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');

/** Declaraciones `--nombre: valor` de un bloque, por el selector con el que empieza. */
function declarations(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No se encontró el bloque ${selector} en tokens.css`);
  const end = css.indexOf('\n}', start);
  const block = css.slice(start, end);
  const map = new Map<string, string>();
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map.set(match[1], match[2].trim().toLowerCase());
  return map;
}

const dark = declarations(tokensCss, ':root');
const light = declarations(tokensCss, ":root[data-theme='light']");

describe('tinta de cada juego del catálogo', () => {
  it('el catálogo tiene al menos los tres juegos de hoy', () => {
    expect(GAME_LIST.map((game) => game.id)).toEqual(['lol', 'r6', 'cs2']);
  });

  it.each(GAME_LIST.map((game) => [game.id, game] as const))('«%s» enlaza su tinta con un token', (id, game) => {
    expect(game.inkVar).toBe(`var(--game-ink-${id})`);
  });

  it.each(GAME_LIST.map((game) => [game.id, game] as const))('«%s» tiene su token con el valor de `accent` en el tema oscuro', (id, game) => {
    expect(dark.get(`--game-ink-${id}`)).toBe(game.accent.toLowerCase());
  });

  it.each(GAME_LIST.map((game) => [game.id, game] as const))('«%s» tiene el mismo valor en el tema claro', (id, game) => {
    // Sin redefinirlo en el tema claro hereda el del oscuro; si se redefine, debe ser el mismo.
    const lightValue = light.get(`--game-ink-${id}`) ?? dark.get(`--game-ink-${id}`);
    expect(lightValue).toBe(game.accent.toLowerCase());
  });
});

describe('tokens nuevos de la spec 017 con los valores de hoy (plan 3.2)', () => {
  const expected: [string, string][] = [
    ['--btn-pen-shadow', 'inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px -12px rgba(205,242,75,0.6)'],
    ['--danger-edge', 'rgba(255,107,94,0.4)'],
    ['--btn-orb-bg', 'rgba(12,15,2,0.12)'],
    ['--ok-edge', 'rgba(86,214,143,0.35)'],
    ['--warn-edge', 'rgba(241,178,74,0.35)'],
    ['--tab-ink', '#0d0e10'],
    ['--tab-pill-shadow', 'inset 0 1px 0 rgba(255,255,255,0.35), 0 6px 18px -8px rgba(0,0,0,0.8)'],
  ];
  const squash = (value: string | undefined) => value?.replace(/\s+/g, '').replace(/,/g, ', ');

  it.each(expected)('%s existe con el valor de hoy y es el mismo en los dos temas', (name, value) => {
    expect(squash(dark.get(name))).toBe(squash(value));
    expect(squash(light.get(name) ?? dark.get(name))).toBe(squash(value));
  });

  it('el indicador de foco sale del acento de cada tema', () => {
    expect(dark.get('--focus-ring')).toBe('var(--accent-text)');
    expect(light.get('--focus-ring') ?? dark.get('--focus-ring')).toBe('var(--accent-text)');
  });

  it('el borde y el halo de un campo con foco: los de hoy en oscuro y el tono del foco en claro', () => {
    expect(dark.get('--focus-edge')).toBe('var(--volt-edge)');
    expect(dark.get('--focus-halo')).toBe('var(--volt-wash)');
    expect(light.get('--focus-edge')).toBe('var(--focus-ring)');
    expect(light.get('--focus-halo')).toMatch(/^color-mix\(in srgb, var\(--focus-ring\) \d+%, transparent\)$/);
  });
});
