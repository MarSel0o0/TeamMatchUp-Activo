import { describe, expect, it } from 'vitest';
import { dialName, pageStepValue } from './dial';

/** Spec 017, RF-11; plan 5.3. Los valores de las tablas salen de la línea base de T2 (Chrome 159). */
const RANK = { min: 0, max: 50, step: 5 } as const;
const HOURS = { min: 0, max: 12, step: 1 } as const;

describe('dialName: el nombre accesible que hoy calcula el navegador', () => {
  it('une la etiqueta, el valor y la unidad con espacios', () => {
    expect(dialName('Diferencia máxima de rango', 25, 'pts')).toBe('Diferencia máxima de rango 25 pts');
    expect(dialName('Horas en común por semana', 4, 'h')).toBe('Horas en común por semana 4 h');
  });

  it('cambia con el valor, también en los extremos', () => {
    expect(dialName('Diferencia máxima de rango', 0, 'pts')).toBe('Diferencia máxima de rango 0 pts');
    expect(dialName('Horas en común por semana', 12, 'h')).toBe('Horas en común por semana 12 h');
  });
});

describe('pageStepValue: Re Pág y Av Pág de la línea base', () => {
  // Cada fila: valor de partida → [Re Pág, Av Pág] medido en la línea base (T2, pagekeys.json).
  const rankTable: [number, number, number][] = [
    [0, 5, 0],
    [5, 10, 0],
    [20, 25, 15],
    [25, 30, 20],
    [45, 50, 40],
    [50, 50, 45],
  ];
  const hoursTable: [number, number, number][] = [
    [0, 1, 0],
    [1, 2, 0],
    [4, 5, 3],
    [6, 7, 5],
    [11, 12, 10],
    [12, 12, 11],
  ];

  it.each(rankTable)('«Diferencia máxima de rango» desde %i: Re Pág %i, Av Pág %i', (start, up, down) => {
    expect(pageStepValue('PageUp', start, RANK)).toBe(up);
    expect(pageStepValue('PageDown', start, RANK)).toBe(down);
  });

  it.each(hoursTable)('«Horas en común» desde %i: Re Pág %i, Av Pág %i', (start, up, down) => {
    expect(pageStepValue('PageUp', start, HOURS)).toBe(up);
    expect(pageStepValue('PageDown', start, HOURS)).toBe(down);
  });

  it('no atiende ninguna otra tecla', () => {
    for (const key of ['ArrowUp', 'ArrowDown', 'Home', 'End', 'a', ' ', 'Enter', 'pageup']) {
      expect(pageStepValue(key, 25, RANK)).toBeNull();
    }
  });

  it('el resultado siempre es un múltiplo del paso desde el mínimo y queda dentro del rango', () => {
    for (let value = RANK.min; value <= RANK.max; value += RANK.step) {
      for (const key of ['PageUp', 'PageDown']) {
        const next = pageStepValue(key, value, RANK);
        expect(next).not.toBeNull();
        expect(next! % RANK.step).toBe(0);
        expect(next!).toBeGreaterThanOrEqual(RANK.min);
        expect(next!).toBeLessThanOrEqual(RANK.max);
      }
    }
    for (let value = HOURS.min; value <= HOURS.max; value++) {
      for (const key of ['PageUp', 'PageDown']) {
        const next = pageStepValue(key, value, HOURS)!;
        expect(Number.isInteger(next)).toBe(true);
        expect(next).toBeGreaterThanOrEqual(HOURS.min);
        expect(next).toBeLessThanOrEqual(HOURS.max);
      }
    }
  });

  it('un rango ancho da un salto mayor que el paso (un décimo del rango) y se ajusta al paso', () => {
    // Regla elegida (coincide con las 24 mediciones de T2): salto = max((máximo − mínimo) / 10, paso), ajustado al paso.
    expect(pageStepValue('PageUp', 0, { min: 0, max: 100, step: 1 })).toBe(10);
    expect(pageStepValue('PageDown', 55, { min: 0, max: 100, step: 5 })).toBe(45);
    expect(pageStepValue('PageUp', 2, { min: 1, max: 101, step: 2 })).toBe(13);
  });
});
