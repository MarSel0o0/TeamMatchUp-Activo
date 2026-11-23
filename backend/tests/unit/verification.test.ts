import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applyRealSync, verifiedState } from "../../src/domain/verification.ts";
import type { RealData, RealMatch } from "../../src/domain/verification.ts";
import type { AccountState } from "../../src/domain/accountState.ts";
import type { Snapshot } from "../../src/domain/rankSimulator.ts";

// Spec 012, RF-8, RF-9, RF-15; plan, sección 2 (`verifiedState`, `applyRealSync`).

const T0 = new Date("2026-11-04T10:00:00.000Z");
const T1 = new Date("2026-11-04T11:00:00.000Z");
const T2 = new Date("2026-11-04T12:00:00.000Z");

function snapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return { tier: "Gold", division: "II", points: 40, normalized: 50, recordedAt: T0, ...overrides };
}

function match(id: string, playedAt: Date, result: "win" | "loss" = "win"): RealMatch {
  return { id, gameId: "lol", playedAt, result, summary: `partida ${id}`, durationMinutes: 30, rankDelta: 0 };
}

function minutesBefore(date: Date, minutes: number): Date {
  return new Date(date.getTime() - minutes * 60_000);
}

/** Estado simulado de una cuenta vinculada a mano, con historial de tres puntos. */
function simulatedBase(): AccountState {
  const first = snapshot({ tier: "Silver", division: "I", points: 10, normalized: 30, recordedAt: minutesBefore(T0, 600) });
  const second = snapshot({ tier: "Gold", division: "III", points: 60, normalized: 40, recordedAt: minutesBefore(T0, 300) });
  const current = snapshot();
  return {
    currentRank: current,
    rankHistory: [first, second, current],
    matches: [match("sim-2", minutesBefore(T0, 10)), match("sim-1", minutesBefore(T0, 50), "loss")],
    readingNumber: 4,
    lastSyncedAt: minutesBefore(T0, 20),
  };
}

const REAL_RANK = snapshot({ tier: "Platinum", division: "IV", points: 12, normalized: 60, recordedAt: T1 });

describe("verifiedState (RF-8, RF-9)", () => {
  test("fuente con rango y partidas: reemplaza lo simulado y el historial empieza con un solo punto real", () => {
    const base = simulatedBase();
    const real: RealData = {
      handle: "Real#LAS",
      rank: REAL_RANK,
      matches: [match("r-2", minutesBefore(T1, 5)), match("r-1", minutesBefore(T1, 40), "loss")],
    };
    const state = verifiedState(base, real, T1);
    assert.deepStrictEqual(state.currentRank, REAL_RANK);
    assert.deepStrictEqual(state.rankHistory, [REAL_RANK]);
    assert.deepStrictEqual(
      state.matches.map((m) => m.id),
      ["r-2", "r-1"],
    );
    assert.deepStrictEqual(state.lastSyncedAt, T1);
  });

  test("nunca mezcla puntos simulados y reales en el historial (RF-9)", () => {
    const state = verifiedState(simulatedBase(), { handle: "x", rank: REAL_RANK }, T1);
    assert.strictEqual(state.rankHistory.length, 1);
    assert.ok(!state.rankHistory.some((point) => point.tier === "Silver" || point.tier === "Gold"));
  });

  test("fuente sin rango ni partidas (Steam): rango, historial y partidas de la base quedan intactos", () => {
    const base = simulatedBase();
    const state = verifiedState(base, { handle: "76561190000000001", profile: { displayName: "Ana" } }, T1);
    assert.deepStrictEqual(state.currentRank, base.currentRank);
    assert.deepStrictEqual(state.rankHistory, base.rankHistory);
    assert.deepStrictEqual(state.matches, base.matches);
    assert.deepStrictEqual(state.lastSyncedAt, T1);
  });

  test("solo rango: las partidas simuladas de la base se conservan", () => {
    const base = simulatedBase();
    const state = verifiedState(base, { handle: "x", rank: REAL_RANK }, T1);
    assert.deepStrictEqual(state.matches, base.matches);
    assert.deepStrictEqual(state.rankHistory, [REAL_RANK]);
  });

  test("solo partidas: el rango y el historial simulados se conservan", () => {
    const base = simulatedBase();
    const state = verifiedState(base, { handle: "x", matches: [match("r-1", T1)] }, T1);
    assert.deepStrictEqual(state.currentRank, base.currentRank);
    assert.deepStrictEqual(state.rankHistory, base.rankHistory);
    assert.deepStrictEqual(
      state.matches.map((m) => m.id),
      ["r-1"],
    );
  });

  test("conserva el número de lectura de la base", () => {
    assert.strictEqual(verifiedState(simulatedBase(), { handle: "x", rank: REAL_RANK }, T1).readingNumber, 4);
  });

  test("más de 20 partidas reales: quedan las 20 más recientes, en orden", () => {
    const matches = Array.from({ length: 25 }, (_, i) => match(`r-${String(i).padStart(2, "0")}`, minutesBefore(T1, i * 10)));
    const state = verifiedState(simulatedBase(), { handle: "x", matches }, T1);
    assert.strictEqual(state.matches.length, 20);
    assert.strictEqual(state.matches[0]?.id, "r-00");
    assert.strictEqual(state.matches[19]?.id, "r-19");
  });

  test("la partida principal indicada por la fuente siempre queda", () => {
    const matches = Array.from({ length: 25 }, (_, i) => match(`r-${String(i).padStart(2, "0")}`, minutesBefore(T1, i * 10)));
    const state = verifiedState(simulatedBase(), { handle: "x", matches, mainMatchId: "r-24" }, T1);
    assert.strictEqual(state.matches.length, 20);
    assert.ok(state.matches.some((m) => m.id === "r-24"));
  });

  test("no muta la base ni los datos reales", () => {
    const base = simulatedBase();
    const baseCopy = structuredClone(base);
    const real: RealData = { handle: "x", rank: REAL_RANK, matches: [match("r-1", T1)] };
    const realCopy = structuredClone(real);
    verifiedState(base, real, T1);
    assert.deepStrictEqual(base, baseCopy);
    assert.deepStrictEqual(real, realCopy);
  });
});

describe("applyRealSync (RF-9, RF-15)", () => {
  function verifiedBase(): AccountState {
    return {
      currentRank: REAL_RANK,
      rankHistory: [REAL_RANK],
      matches: [match("r-1", minutesBefore(T1, 40)), match("r-0", minutesBefore(T1, 90), "loss")],
      readingNumber: 4,
      lastSyncedAt: T1,
    };
  }

  test("mismo rango: no agrega punto al historial, pero el vigente toma la fecha nueva", () => {
    const next = { ...REAL_RANK, recordedAt: T2 };
    const state = applyRealSync(verifiedBase(), { handle: "x", rank: next }, T2);
    assert.deepStrictEqual(state.rankHistory, [REAL_RANK]);
    assert.deepStrictEqual(state.currentRank, next);
  });

  test("cambia la división, los puntos o el tier: agrega un punto al final", () => {
    const changes: Partial<Snapshot>[] = [{ points: 55 }, { division: "III" }, { tier: "Emerald" }];
    for (const change of changes) {
      const next = { ...REAL_RANK, ...change, recordedAt: T2 };
      const state = applyRealSync(verifiedBase(), { handle: "x", rank: next }, T2);
      assert.deepStrictEqual(state.rankHistory, [REAL_RANK, next], JSON.stringify(change));
      assert.deepStrictEqual(state.currentRank, next);
    }
  });

  test("sin rango en la lectura: rango e historial quedan igual", () => {
    const base = verifiedBase();
    const state = applyRealSync(base, { handle: "x", profile: { hoursTotal: 10 } }, T2);
    assert.deepStrictEqual(state.currentRank, base.currentRank);
    assert.deepStrictEqual(state.rankHistory, base.rankHistory);
    assert.deepStrictEqual(state.matches, base.matches);
    assert.deepStrictEqual(state.lastSyncedAt, T2);
  });

  test("partidas nuevas se suman; las repetidas conservan la guardada", () => {
    const base = verifiedBase();
    const repeated = { ...match("r-1", minutesBefore(T1, 40)), summary: "texto distinto" };
    const state = applyRealSync(base, { handle: "x", matches: [match("r-2", minutesBefore(T2, 5)), repeated] }, T2);
    assert.deepStrictEqual(
      state.matches.map((m) => m.id),
      ["r-2", "r-1", "r-0"],
    );
    assert.strictEqual(state.matches.find((m) => m.id === "r-1")?.summary, "partida r-1");
  });

  test("mantiene el número de lectura y actualiza la fecha de sincronización", () => {
    const state = applyRealSync(verifiedBase(), { handle: "x", rank: REAL_RANK }, T2);
    assert.strictEqual(state.readingNumber, 4);
    assert.deepStrictEqual(state.lastSyncedAt, T2);
  });

  test("no muta el estado ni los datos reales", () => {
    const base = verifiedBase();
    const baseCopy = structuredClone(base);
    const real: RealData = { handle: "x", rank: { ...REAL_RANK, points: 99, recordedAt: T2 }, matches: [match("r-5", T2)] };
    const realCopy = structuredClone(real);
    applyRealSync(base, real, T2);
    assert.deepStrictEqual(base, baseCopy);
    assert.deepStrictEqual(real, realCopy);
  });
});
