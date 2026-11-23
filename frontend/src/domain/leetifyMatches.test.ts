import { describe, expect, test } from 'vitest';
import { outcomeLabel, scoreLabel, showsLeetifyMatches } from './leetifyMatches';

// Spec 019, RF-2, RF-3, RF-4, RF-11; plan, §2 y §4.

describe('outcomeLabel (RF-3)', () => {
  test('rotula los tres resultados de Leetify', () => {
    expect(outcomeLabel('win')).toBe('Victoria');
    expect(outcomeLabel('loss')).toBe('Derrota');
    expect(outcomeLabel('tie')).toBe('Empate');
  });
});

describe('scoreLabel (RF-3)', () => {
  test('muestra el marcador en el orden que lo entrega Leetify, sin recalcular', () => {
    expect(scoreLabel([13, 9])).toBe('13 – 9');
    expect(scoreLabel([8, 13])).toBe('8 – 13');
    expect(scoreLabel([12, 12])).toBe('12 – 12');
  });
});

describe('showsLeetifyMatches (RF-2, RF-4, RF-11)', () => {
  test('solo cuando el bloque de partidas tiene origen Leetify', () => {
    expect(showsLeetifyMatches('leetify')).toBe(true);
    for (const origin of ['simulated', 'steam', 'riot'] as const) {
      expect(showsLeetifyMatches(origin)).toBe(false);
    }
  });
});
