import { describe, expect, it } from 'vitest';
import { findColorLiterals, findColorLiteralsInCss } from './colorLiterals';

/** Spec 017, RF-2, RNF-6; plan 5.6 y 9.1 (f). */
describe('findColorLiterals: lo que cuenta como color escrito a mano', () => {
  it('detecta hexadecimales de 3, 4, 6 y 8 dígitos', () => {
    expect(findColorLiterals('#fff')).toEqual(['#fff']);
    expect(findColorLiterals('#ffff')).toEqual(['#ffff']);
    expect(findColorLiterals('#c6ee35')).toEqual(['#c6ee35']);
    expect(findColorLiterals('1px solid #c6ee3580')).toEqual(['#c6ee3580']);
  });

  it('detecta rgb(), rgba(), hsl() y hsla() con su contenido', () => {
    expect(findColorLiterals('rgb(12, 15, 2)')).toEqual(['rgb(12, 15, 2)']);
    expect(findColorLiterals('rgba(205,242,75,0.6)')).toEqual(['rgba(205,242,75,0.6)']);
    expect(findColorLiterals('hsl(70 80% 60%)')).toEqual(['hsl(70 80% 60%)']);
    expect(findColorLiterals('hsla(70, 80%, 60%, .5)')).toEqual(['hsla(70, 80%, 60%, .5)']);
  });

  it('detecta las demás funciones de color (hwb, lab, lch, oklab, oklch, color)', () => {
    for (const value of ['hwb(90 10% 10%)', 'lab(50% 40 59)', 'lch(50% 40 59)', 'oklab(0.6 0.1 0.1)', 'oklch(0.7 0.2 120)', 'color(display-p3 1 0 0)']) {
      expect(findColorLiterals(value)).toEqual([value]);
    }
  });

  it('detecta nombres de color como palabras sueltas, sin importar mayúsculas', () => {
    expect(findColorLiterals('red')).toEqual(['red']);
    expect(findColorLiterals('1px solid White')).toEqual(['White']);
    expect(findColorLiterals('background: black')).toEqual(['black']);
    expect(findColorLiterals('rebeccapurple')).toEqual(['rebeccapurple']);
  });

  it('una mezcla con un literal dentro falla, aunque el otro color sea un token', () => {
    expect(findColorLiterals('color-mix(in srgb, #fff 20%, var(--surface))')).toEqual(['#fff']);
    expect(findColorLiterals('color-mix(in srgb, var(--volt) 75%, red)')).toEqual(['red']);
  });

  it('una sombra con un literal dentro falla y señala cada literal', () => {
    expect(findColorLiterals('inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 24px -12px rgba(205,242,75,0.6)')).toEqual([
      'rgba(255,255,255,0.35)',
      'rgba(205,242,75,0.6)',
    ]);
  });

  it('un degradado con un literal dentro falla', () => {
    expect(findColorLiterals('linear-gradient(to right, var(--volt), #000)')).toEqual(['#000']);
  });

  it('un literal dentro del respaldo de var() también falla', () => {
    expect(findColorLiterals('var(--missing, #123456)')).toEqual(['#123456']);
  });
});

describe('findColorLiterals: lo que no es un color escrito a mano', () => {
  it('las palabras clave no fijan un color', () => {
    for (const value of ['transparent', 'currentColor', 'currentcolor', 'inherit', 'initial', 'unset', 'revert', 'revert-layer']) {
      expect(findColorLiterals(value)).toEqual([]);
    }
  });

  it('una referencia a un token pasa, aunque el nombre del token sea un nombre de color', () => {
    expect(findColorLiterals('var(--white)')).toEqual([]);
    expect(findColorLiterals('var(--red)')).toEqual([]);
    expect(findColorLiterals('1px solid var(--line-strong)')).toEqual([]);
  });

  it('una mezcla hecha solo con tokens y palabras clave pasa', () => {
    expect(findColorLiterals('color-mix(in srgb, var(--focus-ring) 75%, transparent)')).toEqual([]);
    expect(findColorLiterals('linear-gradient(to right, var(--volt), transparent)')).toEqual([]);
    expect(findColorLiterals('0 0 0 4px var(--focus-halo), inset 0 1px 0 var(--highlight)')).toEqual([]);
  });

  it('no confunde un nombre de color dentro de un identificador, una cadena ni una dirección', () => {
    expect(findColorLiterals('red-pulse 1s infinite')).toEqual([]);
    expect(findColorLiterals('animation: tan-slide 1s')).toEqual([]);
    expect(findColorLiterals('content: "red #fff"')).toEqual([]);
    expect(findColorLiterals("url('/assets/red-#fff.svg')")).toEqual([]);
    expect(findColorLiterals('/* #fff rojo */ var(--ink)')).toEqual([]);
  });

  it('un valor vacío o sin color no devuelve nada', () => {
    expect(findColorLiterals('')).toEqual([]);
    expect(findColorLiterals('12px 0 auto')).toEqual([]);
  });
});

describe('findColorLiteralsInCss: solo los valores de las declaraciones', () => {
  it('ignora selectores con identificadores parecidos a colores y comentarios', () => {
    const css = `
      /* el borde era #fff */
      #fad:hover, .red, a:not(.tan) { color: var(--ink); }
      .x { border: 1px solid var(--line); }
    `;
    expect(findColorLiteralsInCss(css)).toEqual([]);
  });

  it('detecta cada literal con la propiedad en la que está', () => {
    const css = `
      .btn { color: #000; box-shadow: 0 1px 0 rgba(0,0,0,.2), 0 2px var(--x) }
      @media (min-width: 600px) { .y { background: linear-gradient(red, var(--a)); } }
    `;
    expect(findColorLiteralsInCss(css)).toEqual([
      { property: 'color', literal: '#000' },
      { property: 'box-shadow', literal: 'rgba(0,0,0,.2)' },
      { property: 'background', literal: 'red' },
    ]);
  });

  it('lee también las propiedades personalizadas', () => {
    expect(findColorLiteralsInCss(':root { --volt: #c6ee35; --focus-ring: var(--accent-text); }')).toEqual([
      { property: '--volt', literal: '#c6ee35' },
    ]);
  });

  it('acepta la última declaración sin punto y coma', () => {
    expect(findColorLiteralsInCss('.a { color: blue }')).toEqual([{ property: 'color', literal: 'blue' }]);
  });
});
