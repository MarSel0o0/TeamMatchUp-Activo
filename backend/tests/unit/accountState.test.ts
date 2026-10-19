import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  applySync,
  compareCodePoints,
  compareMatches,
  initialState,
  mergeMatches,
  recentMatches,
  shouldAppendSnapshot,
  trend,
  winRate,
} from "../../src/domain/accountState.ts";
import type { AccountState } from "../../src/domain/accountState.ts";
import { simulateReading } from "../../src/domain/rankSimulator.ts";
import type { SimulatedMatch, SimulatedReading, Snapshot } from "../../src/domain/rankSimulator.ts";

// Spec 004, RF-4, RF-10, RF-15, RF-28, DP-9, DP-11, DP-30, DP-36 y RNF-7; plan, sección 6
// ("Transiciones puras").

const NOW = new Date("2026-10-18T12:00:00.000Z");
const LATER = new Date("2026-10-19T08:30:15.250Z");
const MINUTE = 60_000;

function match(id: string, playedAt: Date, overrides: Partial<SimulatedMatch> = {}): SimulatedMatch {
  return {
    id,
    gameId: "lol",
    playedAt,
    result: "win",
    summary: "Ahri · 1/2/3",
    durationMinutes: 30,
    rankDelta: 15,
    ...overrides,
  };
}

function minutesBefore(base: Date, minutes: number): Date {
  return new Date(base.getTime() - minutes * MINUTE);
}

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { tier: "Gold", division: "II", points: 40, normalized: 50, recordedAt: NOW, ...overrides };
}

function ids(matches: readonly SimulatedMatch[]): string[] {
  return matches.map((m) => m.id);
}

/** Lectura construida a mano a partir de la fotografía y las partidas dadas. */
function reading(snap: Snapshot, matches: SimulatedMatch[], mainMatchId: string, verified = true): SimulatedReading {
  return { snapshot: snap, matches, mainMatchId, verified };
}

describe("compareMatches (RF-28)", () => {
  test("más reciente primero", () => {
    const newer = match("m-0-0", NOW);
    const older = match("m-0-1", minutesBefore(NOW, 5));
    assert.ok(compareMatches(newer, older) < 0);
    assert.ok(compareMatches(older, newer) > 0);
  });

  test("a igual fecha, identificador mayor como texto primero: m-9-0 antes que m-10-0", () => {
    const nine = match("m-9-0", NOW);
    const ten = match("m-10-0", NOW);
    assert.ok(compareMatches(nine, ten) < 0);
    assert.ok(compareMatches(ten, nine) > 0);
  });

  test("misma fecha con identificadores astral y U+FFFF: primero el astral", () => {
    const astral = match("m-\u{1F600}", NOW);
    const bmp = match("m-\uFFFF", NOW);
    assert.ok(compareMatches(astral, bmp) < 0);
    assert.ok(compareMatches(bmp, astral) > 0);
    assert.deepEqual(ids([bmp, astral].sort(compareMatches)), ["m-\u{1F600}", "m-\uFFFF"]);
  });

  test("misma partida → 0", () => {
    const a = match("m-1-0", NOW);
    assert.strictEqual(compareMatches(a, match("m-1-0", NOW)), 0);
  });
});

describe("compareCodePoints (RF-28, T14)", () => {
  test("compara por código Unicode, no por unidades UTF-16: U+1F600 va después de U+FFFF", () => {
    assert.ok(compareCodePoints("m-\u{1F600}", "m-\uFFFF") > 0);
    assert.ok(compareCodePoints("m-\uFFFF", "m-\u{1F600}") < 0);
  });

  test("U+FF5E frente a U+1F600: el astral es mayor", () => {
    assert.ok(compareCodePoints("\u{1F600}", "\uFF5E") > 0);
    assert.ok(compareCodePoints("\uFF5E", "\u{1F600}") < 0);
  });

  test("el prefijo más corto va antes", () => {
    assert.ok(compareCodePoints("m-1", "m-1-0") < 0);
    assert.ok(compareCodePoints("m-1-0", "m-1") > 0);
    assert.ok(compareCodePoints("", "a") < 0);
  });

  test("iguales → 0", () => {
    assert.strictEqual(compareCodePoints("m-1-0", "m-1-0"), 0);
    assert.strictEqual(compareCodePoints("", ""), 0);
    assert.strictEqual(compareCodePoints("m-\u{1F600}", "m-\u{1F600}"), 0);
  });

  test("texto ASCII: orden por código ('m-9-0' > 'm-10-0')", () => {
    assert.ok(compareCodePoints("m-9-0", "m-10-0") > 0);
  });
});

describe("mergeMatches (RF-15, RF-28)", () => {
  test("sin repetidos: conserva la guardada (su fecha y sus campos)", () => {
    const savedVersion = match("m-1-1", minutesBefore(NOW, 60), { summary: "guardada", result: "loss" });
    const incomingVersion = match("m-1-1", minutesBefore(NOW, 10), { summary: "nueva", result: "win" });
    const main = match("m-2-0", NOW);
    const merged = mergeMatches([savedVersion], [main, incomingVersion], "m-2-0");
    assert.deepStrictEqual(ids(merged), ["m-2-0", "m-1-1"]);
    assert.deepStrictEqual(merged[1], savedVersion);
  });

  test("ordena por fecha descendente y desempata m-9-0 antes que m-10-0", () => {
    const saved = [
      match("m-10-0", NOW),
      match("m-3-2", minutesBefore(NOW, 300)),
    ];
    const incoming = [
      match("m-9-0", NOW),
      match("m-9-1", minutesBefore(NOW, 30)),
      match("m-9-2", minutesBefore(NOW, 400)),
    ];
    const merged = mergeMatches(saved, incoming, "m-9-0");
    assert.deepStrictEqual(ids(merged), ["m-9-0", "m-10-0", "m-9-1", "m-3-2", "m-9-2"]);
  });

  test("no muta las listas de entrada", () => {
    const saved = [match("m-0-1", minutesBefore(NOW, 30)), match("m-0-0", NOW)];
    const incoming = [match("m-1-0", LATER)];
    const savedCopy = [...saved];
    const incomingCopy = [...incoming];
    mergeMatches(saved, incoming, "m-1-0");
    assert.deepStrictEqual(saved, savedCopy);
    assert.deepStrictEqual(incoming, incomingCopy);
  });

  test("corte en 20: se quedan las 20 más recientes", () => {
    const saved: SimulatedMatch[] = [];
    for (let j = 0; j < 18; j += 1) saved.push(match(`m-0-${j}`, minutesBefore(NOW, 100 + j)));
    const incoming: SimulatedMatch[] = [];
    for (let j = 0; j < 5; j += 1) incoming.push(match(`m-1-${j}`, minutesBefore(LATER, j)));
    const merged = mergeMatches(saved, incoming, "m-1-0");
    assert.strictEqual(merged.length, 20);
    const expected = [
      ...incoming.map((m) => m.id),
      ...saved.slice(0, 15).map((m) => m.id),
    ];
    assert.deepStrictEqual(ids(merged), expected);
  });

  test("con 20 o menos no se corta nada", () => {
    const saved: SimulatedMatch[] = [];
    for (let j = 0; j < 19; j += 1) saved.push(match(`m-0-${j}`, minutesBefore(NOW, 10 + j)));
    const merged = mergeMatches(saved, [match("m-1-0", LATER)], "m-1-0");
    assert.strictEqual(merged.length, 20);
    assert.strictEqual(merged[0]?.id, "m-1-0");
  });

  test("principal conservada aunque haya más de 20 partidas de fecha igual o posterior", () => {
    // 21 guardadas con fecha posterior a la principal (reloj atrasado) y 2 con la misma
    // fecha e identificador mayor como texto (van antes que la principal).
    const early = minutesBefore(NOW, 600);
    const saved: SimulatedMatch[] = [];
    for (let j = 0; j < 21; j += 1) saved.push(match(`m-0-${j}`, minutesBefore(NOW, j)));
    saved.push(match("m-9-5", early), match("m-9-7", early));
    const main = match("m-10-0", early);
    const older = match("m-10-1", minutesBefore(early, 30));
    const merged = mergeMatches(saved, [main, older], "m-10-0");

    assert.strictEqual(merged.length, 20);
    // 19 primeras de las demás, en orden, y la principal en su posición del mismo orden.
    const others = saved.slice(0, 19).map((m) => m.id);
    assert.deepStrictEqual(ids(merged), [...others, "m-10-0"]);
    assert.deepStrictEqual(merged[19], main);
  });

  test("principal conservada en el sitio que le toca entre las 19 demás", () => {
    // 25 partidas más recientes que la principal → la principal va la última.
    // Además, una partida de igual fecha con identificador menor va detrás y se descarta.
    const early = minutesBefore(NOW, 600);
    const saved: SimulatedMatch[] = [];
    for (let j = 0; j < 25; j += 1) saved.push(match(`m-0-${j}`, minutesBefore(NOW, j)));
    const main = match("m-2-0", early);
    const sameDateSmaller = match("m-10-3", early);
    const merged = mergeMatches([...saved, sameDateSmaller], [main], "m-2-0");
    assert.strictEqual(merged.length, 20);
    assert.ok(ids(merged).includes("m-2-0"));
    assert.ok(!ids(merged).includes("m-10-3"));
    assert.strictEqual(merged[19]?.id, "m-2-0");
  });
});

describe("shouldAppendSnapshot (DP-9)", () => {
  test("mismo tier, división y puntos → no agrega (aunque cambien fecha o normalizado)", () => {
    const previous = snapshot();
    assert.strictEqual(shouldAppendSnapshot(previous, snapshot({ recordedAt: LATER })), false);
    assert.strictEqual(shouldAppendSnapshot(previous, snapshot({ normalized: 51 })), false);
  });

  test("cambia el tier → agrega", () => {
    assert.strictEqual(shouldAppendSnapshot(snapshot(), snapshot({ tier: "Platinum" })), true);
  });

  test("cambia la división → agrega", () => {
    assert.strictEqual(shouldAppendSnapshot(snapshot(), snapshot({ division: "I" })), true);
  });

  test("cambian los puntos → agrega", () => {
    assert.strictEqual(shouldAppendSnapshot(snapshot(), snapshot({ points: 41 })), true);
  });

  test("sin división en ambas → solo cuentan tier y puntos", () => {
    const previous: Snapshot = { tier: "Master", points: 120, normalized: 93, recordedAt: NOW };
    const same: Snapshot = { tier: "Master", points: 120, normalized: 93, recordedAt: LATER };
    assert.strictEqual(shouldAppendSnapshot(previous, same), false);
    assert.strictEqual(shouldAppendSnapshot(previous, { ...same, points: 121 }), true);
  });

  test("división presente frente a ausente → agrega", () => {
    const withDivision = snapshot();
    const withoutDivision: Snapshot = { tier: "Gold", points: 40, normalized: 50, recordedAt: NOW };
    assert.strictEqual(shouldAppendSnapshot(withDivision, withoutDivision), true);
    assert.strictEqual(shouldAppendSnapshot(withoutDivision, withDivision), true);
  });
});

describe("initialState (RF-4)", () => {
  test("lectura 0 real: rango vigente, único elemento del historial, partidas, verificada, número 0 y fecha", () => {
    const r = simulateReading({ gameId: "lol", canonicalHandle: "jugador1#las", readingNumber: 0, now: NOW });
    const state = initialState(r, NOW);
    assert.deepStrictEqual(state.currentRank, r.snapshot);
    assert.deepStrictEqual(state.rankHistory, [r.snapshot]);
    assert.deepStrictEqual(state.matches, mergeMatches([], r.matches, r.mainMatchId));
    assert.strictEqual(state.readingNumber, 0);
    assert.deepStrictEqual(state.lastSyncedAt, NOW);
    assert.strictEqual(state.verified, r.verified);
  });

  test("las partidas quedan en el orden de RF-28 aunque la lectura venga desordenada", () => {
    const r = reading(snapshot(), [match("m-0-1", minutesBefore(NOW, 30)), match("m-0-0", NOW)], "m-0-0", false);
    const state = initialState(r, NOW);
    assert.deepStrictEqual(ids(state.matches), ["m-0-0", "m-0-1"]);
    assert.strictEqual(state.verified, false);
    assert.strictEqual(state.readingNumber, 0);
  });
});

describe("applySync (RF-10, DP-9, DP-36)", () => {
  function baseState(): AccountState {
    const first = snapshot();
    return {
      currentRank: first,
      rankHistory: [first],
      matches: [match("m-0-0", NOW), match("m-0-1", minutesBefore(NOW, 40))],
      readingNumber: 0,
      lastSyncedAt: NOW,
      verified: true,
    };
  }

  test("sin cambio de rango: no agrega fotografía; el último del historial coincide con el vigente salvo la fecha", () => {
    const state = baseState();
    const next = snapshot({ recordedAt: LATER });
    const r = reading(next, [match("m-1-0", LATER)], "m-1-0");
    const result = applySync(state, r, 1, LATER);

    assert.strictEqual(result.rankHistory.length, 1);
    assert.deepStrictEqual(result.currentRank, next);
    const last = result.rankHistory.at(-1);
    assert.ok(last !== undefined);
    const { recordedAt: lastDate, ...lastRest } = last;
    const { recordedAt: currentDate, ...currentRest } = result.currentRank;
    assert.deepStrictEqual(lastRest, currentRest);
    assert.deepStrictEqual(lastDate, NOW);
    assert.deepStrictEqual(currentDate, LATER);
    // Sí se actualizan partidas, número de lectura y fecha de sincronización.
    assert.deepStrictEqual(ids(result.matches), ["m-1-0", "m-0-0", "m-0-1"]);
    assert.strictEqual(result.readingNumber, 1);
    assert.deepStrictEqual(result.lastSyncedAt, LATER);
  });

  test("con cambio de rango: agrega la fotografía al final y deja el vigente", () => {
    const state = baseState();
    const next = snapshot({ points: 60, recordedAt: LATER });
    const result = applySync(state, reading(next, [match("m-1-0", LATER)], "m-1-0", false), 1, LATER);
    assert.deepStrictEqual(result.rankHistory, [state.currentRank, next]);
    assert.deepStrictEqual(result.currentRank, next);
    assert.strictEqual(result.verified, false);
  });

  test("reloj atrasado: la fotografía va al final aunque su fecha sea anterior (DP-36)", () => {
    const state = baseState();
    const earlier = minutesBefore(NOW, 120);
    const next = snapshot({ tier: "Platinum", recordedAt: earlier });
    const result = applySync(state, reading(next, [match("m-1-0", earlier)], "m-1-0"), 1, earlier);
    assert.deepStrictEqual(result.rankHistory.at(-1), next);
    assert.deepStrictEqual(result.lastSyncedAt, earlier);
    assert.ok(ids(result.matches).includes("m-1-0"));
  });

  test("usa el número de lectura recibido y no muta el estado anterior", () => {
    const state = baseState();
    const before = structuredClone(state);
    const result = applySync(state, reading(snapshot({ points: 1 }), [match("m-7-0", LATER)], "m-7-0"), 7, LATER);
    assert.strictEqual(result.readingNumber, 7);
    assert.deepStrictEqual(state, before);
  });

  test("con lecturas reales consecutivas el historial cumple DP-9 y DP-36", () => {
    let state = initialState(
      simulateReading({ gameId: "r6", canonicalHandle: "jugador2", readingNumber: 0, now: NOW }),
      NOW,
    );
    for (let n = 1; n <= 10; n += 1) {
      const at = new Date(NOW.getTime() + n * 60 * MINUTE);
      const previous = state.currentRank;
      const r = simulateReading({ gameId: "r6", canonicalHandle: "jugador2", readingNumber: n, now: at });
      const lengthBefore = state.rankHistory.length;
      state = applySync(state, r, n, at);
      const appended = shouldAppendSnapshot(previous, r.snapshot);
      assert.strictEqual(state.rankHistory.length, lengthBefore + (appended ? 1 : 0));
      const last = state.rankHistory.at(-1);
      assert.ok(last !== undefined);
      assert.strictEqual(last.tier, state.currentRank.tier);
      assert.strictEqual(last.division, state.currentRank.division);
      assert.strictEqual(last.points, state.currentRank.points);
      assert.strictEqual(last.normalized, state.currentRank.normalized);
      assert.ok(state.matches.length <= 20);
      assert.ok(ids(state.matches).includes(r.mainMatchId));
    }
  });
});

describe("winRate (DP-11)", () => {
  function results(wins: number, total: number): { result: "win" | "loss" }[] {
    return Array.from({ length: total }, (_, i) => ({ result: i < wins ? "win" : "loss" }));
  }

  test("5 de 8 = 63 (62,5 redondea hacia arriba)", () => {
    assert.strictEqual(winRate(results(5, 8)), 63);
  });

  test("0 de 8 = 0", () => {
    assert.strictEqual(winRate(results(0, 8)), 0);
  });

  test("8 de 8 = 100 y 1 de 3 = 33", () => {
    assert.strictEqual(winRate(results(8, 8)), 100);
    assert.strictEqual(winRate(results(1, 3)), 33);
  });

  test("lista vacía = 0 (por seguridad)", () => {
    assert.strictEqual(winRate([]), 0);
  });
});

describe("trend (DP-30)", () => {
  test("historial de un elemento (el vigente) = 0", () => {
    const current = snapshot();
    assert.strictEqual(trend(current, [current]), 0);
  });

  test("vigente menos el primero del historial, sin ventana de tiempo", () => {
    const first = snapshot({ normalized: 40 });
    const middle = snapshot({ normalized: 70, recordedAt: LATER });
    const current = snapshot({ normalized: 55, recordedAt: LATER });
    assert.strictEqual(trend(current, [first, middle, current]), 15);
    assert.strictEqual(trend(snapshot({ normalized: 10 }), [first, current]), -30);
  });

  test("historial vacío = 0", () => {
    assert.strictEqual(trend(snapshot(), []), 0);
  });
});

describe("recentMatches", () => {
  test("devuelve las 8 primeras", () => {
    const matches: SimulatedMatch[] = [];
    for (let j = 0; j < 12; j += 1) matches.push(match(`m-0-${j}`, minutesBefore(NOW, j)));
    assert.deepStrictEqual(recentMatches(matches), matches.slice(0, 8));
  });

  test("con menos de 8 devuelve todas", () => {
    const matches = [match("m-0-0", NOW), match("m-0-1", minutesBefore(NOW, 1))];
    assert.deepStrictEqual(recentMatches(matches), matches);
  });
});
