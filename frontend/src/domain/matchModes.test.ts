import { describe, expect, test } from 'vitest';
import {
  MATCHES_PER_TAB,
  MATCH_MODE_ORDER,
  availableTabs,
  matchesForTab,
  modeOf,
  resolveTab,
  showModeTabs,
} from './matchModes';
import type { MatchMode, MatchRecord, Origin } from './types';

// Spec 020, RF-3, RF-5, RF-7, RF-10, RF-16, RF-17, RNF-4; plan, §2.2 y §7.2 (T8).

/** Partida de LoL; `index` la ordena: 0 es la más reciente. Sin `mode` si se pasa `undefined`. */
function match(index: number, mode: MatchMode | undefined, overrides: Partial<MatchRecord> = {}): MatchRecord {
  return {
    id: `m${String(index).padStart(2, '0')}`,
    gameId: 'lol',
    playedAt: new Date(Date.UTC(2026, 10, 22, 12, 0) - index * 3_600_000).toISOString(),
    result: index % 2 === 0 ? 'win' : 'loss',
    summary: 'Ahri · 5/2/7',
    durationMinutes: 30,
    ...(mode === undefined ? {} : { mode }),
    ...overrides,
  };
}

/** `count` partidas consecutivas, todas del mismo modo, desde `from`. */
function run(count: number, mode: MatchMode, from = 0): MatchRecord[] {
  return Array.from({ length: count }, (_, i) => match(from + i, mode));
}

const ids = (matches: readonly MatchRecord[]) => matches.map((m) => m.id);

describe('MATCH_MODE_ORDER y MATCHES_PER_TAB (RF-5, RF-7)', () => {
  test('orden fijo: Solo/Dúo, Flex, Normales, ARAM, Otros', () => {
    expect([...MATCH_MODE_ORDER]).toEqual(['solo', 'flex', 'normal', 'aram', 'other']);
  });

  test('cada pestaña enseña como máximo 8 partidas', () => {
    expect(MATCHES_PER_TAB).toBe(8);
  });
});

describe('showModeTabs (RF-5, RF-16, RF-17)', () => {
  const some = [match(0, 'solo')];

  test('con origen Riot y al menos una partida, sí', () => {
    expect(showModeTabs('riot', some)).toBe(true);
  });

  test('con origen simulado, Steam o Leetify, no (RF-16)', () => {
    for (const origin of ['simulated', 'steam', 'leetify'] as const satisfies readonly Origin[]) {
      expect(showModeTabs(origin, some)).toBe(false);
    }
  });

  test('sin partidas, no (RF-17)', () => {
    expect(showModeTabs('riot', [])).toBe(false);
  });
});

describe('modeOf (RF-3)', () => {
  test('devuelve el modo de la partida', () => {
    for (const mode of MATCH_MODE_ORDER) expect(modeOf(match(0, mode))).toBe(mode);
  });

  test('una partida sin modo es de Solo/Dúo', () => {
    expect(modeOf(match(0, undefined))).toBe('solo');
  });
});

describe('availableTabs (RF-5)', () => {
  test('con una lista vacía solo está «Todas»', () => {
    expect(availableTabs([])).toEqual(['all']);
  });

  test('con un solo modo: «Todas» y ese modo', () => {
    expect(availableTabs(run(5, 'aram'))).toEqual(['all', 'aram']);
  });

  test('con tres modos: «Todas» y los tres, en el orden fijo, sea cual sea el de las partidas', () => {
    const matches = [match(0, 'aram'), match(1, 'other'), match(2, 'solo'), match(3, 'aram')];
    expect(availableTabs(matches)).toEqual(['all', 'solo', 'aram', 'other']);
  });

  test('con los cinco modos: «Todas» y las cinco', () => {
    const matches = MATCH_MODE_ORDER.map((mode, i) => match(i, mode));
    expect(availableTabs(matches)).toEqual(['all', ...MATCH_MODE_ORDER]);
  });

  test('una partida sin modo cuenta como Solo/Dúo', () => {
    expect(availableTabs([match(0, undefined)])).toEqual(['all', 'solo']);
  });

  test('no hay pestañas de modos sin partidas', () => {
    const tabs = availableTabs([match(0, 'solo'), match(1, 'flex')]);
    for (const absent of ['normal', 'aram', 'other'] as const) expect(tabs).not.toContain(absent);
  });
});

describe('matchesForTab (RF-7)', () => {
  test('«Todas» enseña las 8 más recientes de cualquier modo, aunque haya 20', () => {
    const matches = [...run(10, 'solo', 0), ...run(10, 'aram', 10)];
    expect(ids(matchesForTab(matches, 'all'))).toEqual(ids(matches.slice(0, 8)));
  });

  test('un modo con más de 8 partidas enseña solo las 8 más recientes de ese modo', () => {
    const matches = [match(0, 'aram'), ...run(12, 'solo', 1), match(13, 'flex')];
    const shown = matchesForTab(matches, 'solo');
    expect(shown).toHaveLength(8);
    expect(ids(shown)).toEqual(ids(run(8, 'solo', 1)));
  });

  test('un modo con menos de 8 enseña todas las suyas, saltándose las de otros modos', () => {
    const matches = [match(0, 'solo'), match(1, 'aram'), match(2, 'solo'), match(3, 'flex'), match(4, 'aram')];
    expect(ids(matchesForTab(matches, 'aram'))).toEqual(['m01', 'm04']);
  });

  test('conserva el orden recibido (la más reciente primero)', () => {
    const matches = [match(0, 'solo'), match(1, 'flex'), match(2, 'solo'), match(3, 'solo')];
    expect(ids(matchesForTab(matches, 'solo'))).toEqual(['m00', 'm02', 'm03']);
    expect(ids(matchesForTab(matches, 'all'))).toEqual(['m00', 'm01', 'm02', 'm03']);
  });

  test('una pestaña sin partidas devuelve una lista vacía', () => {
    expect(matchesForTab([match(0, 'solo')], 'aram')).toEqual([]);
    expect(matchesForTab([], 'all')).toEqual([]);
  });

  test('una partida sin modo se enseña en la pestaña de Solo/Dúo', () => {
    expect(ids(matchesForTab([match(0, undefined), match(1, 'aram')], 'solo'))).toEqual(['m00']);
  });

  test('no muta la entrada', () => {
    const matches = [...run(10, 'solo'), ...run(3, 'flex', 10)];
    const copy = structuredClone(matches);
    matchesForTab(matches, 'solo');
    matchesForTab(matches, 'all');
    expect(matches).toEqual(copy);
  });
});

describe('resolveTab (RF-10)', () => {
  const available = ['all', 'solo', 'aram'] as const;

  test('si la pestaña elegida sigue disponible, se conserva', () => {
    expect(resolveTab('aram', available)).toBe('aram');
    expect(resolveTab('all', available)).toBe('all');
  });

  test('si la pestaña elegida desaparece (ya no hay partidas de ese modo), vuelve a «Todas»', () => {
    expect(resolveTab('flex', available)).toBe('all');
  });

  test('«Todas» siempre se puede elegir, aunque no esté en la lista', () => {
    expect(resolveTab('all', [])).toBe('all');
  });
});
