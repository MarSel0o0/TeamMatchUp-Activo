import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applyRiotReading, sameRankBracket } from "../../src/domain/riotLpDelta.ts";
import type { RiotLpBaseline } from "../../src/domain/riotLpDelta.ts";
import type { RiotMatchRecord, RiotRankSnapshot } from "../../src/domain/riotData.ts";
import { normalizeRank } from "../../src/domain/rankScale.ts";

// Spec 014, RF-11, RF-12, RF-30, RF-32; D37, D52, D78, D81, D102; plan §§2.1, 4, P14-4 y 8.1.

const T0 = new Date("2026-11-19T10:00:00.000Z");
const T1 = new Date("2026-11-19T11:00:00.000Z");
const T2 = new Date("2026-11-19T12:00:00.000Z");
const T3 = new Date("2026-11-19T13:00:00.000Z");

function rank(
  tier: string,
  points: number,
  options: { division?: string; canonicalTier?: string; recordedAt?: Date } = {},
): RiotRankSnapshot {
  const canonical = options.canonicalTier ?? tier.charAt(0) + tier.slice(1).toLowerCase();
  return {
    tier,
    ...(options.division === undefined ? {} : { division: options.division }),
    points,
    normalized: normalizeRank("lol", canonical, options.division),
    recordedAt: options.recordedAt ?? T0,
    canonicalTier: canonical,
  };
}

function match(
  id: string,
  playedAt: Date,
  overrides: Partial<RiotMatchRecord> = {},
): RiotMatchRecord {
  const base: RiotMatchRecord = {
    id,
    gameId: "lol",
    playedAt,
    result: "win",
    summary: "Ahri · 7/2/6",
    durationMinutes: 30,
    ...overrides,
  };
  return base;
}

describe("sameRankBracket (RF-30, D37)", () => {
  test("misma división en tiers con divisiones", () => {
    assert.strictEqual(sameRankBracket({ tier: "GOLD", division: "II" }, { tier: "GOLD", division: "II" }), true);
    assert.strictEqual(sameRankBracket({ tier: "GOLD", division: "II" }, { tier: "GOLD", division: "I" }), false);
    assert.strictEqual(sameRankBracket({ tier: "GOLD", division: "I" }, { tier: "PLATINUM", division: "IV" }), false);
  });

  test("en MASTER, GRANDMASTER y CHALLENGER cuenta solo el mismo tier", () => {
    assert.strictEqual(sameRankBracket({ tier: "MASTER" }, { tier: "MASTER" }), true);
    assert.strictEqual(sameRankBracket({ tier: "MASTER" }, { tier: "GRANDMASTER" }), false);
    assert.strictEqual(sameRankBracket({ tier: "GRANDMASTER" }, { tier: "CHALLENGER" }), false);
    assert.strictEqual(sameRankBracket({ tier: "CHALLENGER" }, { tier: "CHALLENGER" }), true);
  });
});

describe("applyRiotReading — verificación inicial (RF-7, RF-27, RF-30, RF-32)", () => {
  test("primera lectura completa reemplaza historial/partidas previos, deja partidas sin delta y fija baseline", () => {
    const simulatedRank = rank("SILVER", 10, { division: "IV" });
    const simulatedMatch = match("m-0-0", T0, { rankDelta: 15 });
    const r0 = rank("GOLD", 50, { division: "II", recordedAt: T1 });
    const m1 = match("LA2_1", T1);

    const out = applyRiotReading({
      previousRank: simulatedRank,
      previousHistory: [simulatedRank],
      previousMatches: [simulatedMatch],
      previousBaseline: null,
      rankResult: { ok: true, rank: r0 },
      matchesResult: { ok: true, matches: [m1], omittedAny: false },
      isVerification: true,
    });

    assert.deepStrictEqual(out.currentRank, r0);
    assert.deepStrictEqual(out.rankHistory, [r0]);
    assert.strictEqual(out.matches.length, 1);
    assert.strictEqual(out.matches[0]?.id, "LA2_1");
    assert.strictEqual(Object.hasOwn(out.matches[0] ?? {}, "rankDelta"), false);
    assert.deepStrictEqual(out.nextBaseline, {
      tier: "GOLD",
      division: "II",
      points: 50,
      matchIds: ["LA2_1"],
    });
  });

  test("verificación sin clasificar deja currentRank null, historial vacío y baseline con tier null", () => {
    const out = applyRiotReading({
      previousRank: null,
      previousHistory: [],
      previousMatches: [],
      previousBaseline: null,
      rankResult: { ok: true, rank: null },
      matchesResult: { ok: true, matches: [], omittedAny: false },
      isVerification: true,
    });

    assert.strictEqual(out.currentRank, null);
    assert.deepStrictEqual(out.rankHistory, []);
    assert.deepStrictEqual(out.matches, []);
    assert.deepStrictEqual(out.nextBaseline, { tier: null, matchIds: [] });
  });

  test("verificación con rango pendiente y partidas leídas no fija baseline; siguiente resync completa deja sin delta", () => {
    const m1 = match("LA2_1", T0);
    const v = applyRiotReading({
      previousRank: null,
      previousHistory: [],
      previousMatches: [],
      previousBaseline: null,
      rankResult: { ok: false },
      matchesResult: { ok: true, matches: [m1], omittedAny: false },
      isVerification: true,
    });

    assert.strictEqual(v.currentRank, null);
    assert.deepStrictEqual(v.rankHistory, []);
    assert.strictEqual(v.nextBaseline, null);
    assert.strictEqual(v.matches.length, 1);

    const r1 = rank("GOLD", 50, { division: "II", recordedAt: T1 });
    const m2 = match("LA2_2", T1);
    const s = applyRiotReading({
      previousRank: v.currentRank,
      previousHistory: v.rankHistory,
      previousMatches: v.matches,
      previousBaseline: v.nextBaseline,
      rankResult: { ok: true, rank: r1 },
      matchesResult: { ok: true, matches: [m2, m1], omittedAny: false },
      isVerification: false,
    });

    assert.deepStrictEqual(s.currentRank, r1);
    assert.deepStrictEqual(s.rankHistory, [r1]);
    assert.strictEqual(s.matches.find((m) => m.id === "LA2_2")?.rankDelta, undefined);
    assert.strictEqual(s.matches.find((m) => m.id === "LA2_1")?.rankDelta, undefined);
    assert.deepStrictEqual(s.nextBaseline, {
      tier: "GOLD",
      division: "II",
      points: 50,
      matchIds: ["LA2_2", "LA2_1"],
    });
  });
});

describe("applyRiotReading — variación de LP (RF-30, D37, D78, D81, D102)", () => {
  const baseRank = rank("GOLD", 50, { division: "II", recordedAt: T0 });
  const baseMatch = match("LA2_1", T0);
  const baseBaseline: RiotLpBaseline = {
    tier: "GOLD",
    division: "II",
    points: 50,
    matchIds: ["LA2_1"],
  };

  test("1 partida nueva en la misma división asigna delta positivo o negativo", () => {
    const winRes = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 68, { division: "II", recordedAt: T1 }) },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(winRes.matches.find((m) => m.id === "LA2_2")?.rankDelta, 18);
    assert.strictEqual(winRes.matches.find((m) => m.id === "LA2_1")?.rankDelta, undefined);

    const lossRes = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 35, { division: "II", recordedAt: T1 }) },
      matchesResult: {
        ok: true,
        matches: [match("LA2_2", T1, { result: "loss" }), baseMatch],
        omittedAny: false,
      },
      isVerification: false,
    });
    assert.strictEqual(lossRes.matches.find((m) => m.id === "LA2_2")?.rankDelta, -15);
  });

  test("2 partidas nuevas entre lecturas quedan ambas sin variación (—)", () => {
    const res = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 80, { division: "II", recordedAt: T1 }) },
      matchesResult: {
        ok: true,
        matches: [match("LA2_3", T2), match("LA2_2", T1), baseMatch],
        omittedAny: false,
      },
      isVerification: false,
    });
    assert.strictEqual(res.matches.find((m) => m.id === "LA2_3")?.rankDelta, undefined);
    assert.strictEqual(res.matches.find((m) => m.id === "LA2_2")?.rankDelta, undefined);
  });

  test("cambio de división (GOLD II → GOLD I) deja la partida nueva sin variación", () => {
    const res = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 10, { division: "I", recordedAt: T1 }) },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(res.matches.find((m) => m.id === "LA2_2")?.rankDelta, undefined);
  });

  test("Master 50 → Master 80 asigna +30; Master → Grandmaster queda sin variación (D37)", () => {
    const m50 = rank("MASTER", 50, { recordedAt: T0 });
    const m80 = rank("MASTER", 80, { recordedAt: T1 });
    const gm = rank("GRANDMASTER", 250, { recordedAt: T2 });
    const baselineMaster: RiotLpBaseline = { tier: "MASTER", points: 50, matchIds: ["LA2_1"] };

    const sameTier = applyRiotReading({
      previousRank: m50,
      previousHistory: [m50],
      previousMatches: [baseMatch],
      previousBaseline: baselineMaster,
      rankResult: { ok: true, rank: m80 },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(sameTier.matches.find((m) => m.id === "LA2_2")?.rankDelta, 30);

    const promoted = applyRiotReading({
      previousRank: sameTier.currentRank,
      previousHistory: sameTier.rankHistory,
      previousMatches: sameTier.matches,
      previousBaseline: sameTier.nextBaseline,
      rankResult: { ok: true, rank: gm },
      matchesResult: {
        ok: true,
        matches: [match("LA2_3", T2), match("LA2_2", T1), baseMatch],
        omittedAny: false,
      },
      isVerification: false,
    });
    assert.strictEqual(promoted.matches.find((m) => m.id === "LA2_3")?.rankDelta, undefined);
    // D37: la variación ya asignada (+30) se conserva intacta.
    assert.strictEqual(promoted.matches.find((m) => m.id === "LA2_2")?.rankDelta, 30);
  });

  test("variación ya asignada es inmutable en lecturas posteriores (D37)", () => {
    const first = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 68, { division: "II", recordedAt: T1 }) },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(first.matches.find((m) => m.id === "LA2_2")?.rankDelta, 18);

    const second = applyRiotReading({
      previousRank: first.currentRank,
      previousHistory: first.rankHistory,
      previousMatches: first.matches,
      previousBaseline: first.nextBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 90, { division: "II", recordedAt: T2 }) },
      matchesResult: {
        ok: true,
        matches: [match("LA2_3", T2), match("LA2_2", T1), baseMatch],
        omittedAny: false,
      },
      isVerification: false,
    });
    assert.strictEqual(second.matches.find((m) => m.id === "LA2_2")?.rankDelta, 18);
    assert.strictEqual(second.matches.find((m) => m.id === "LA2_3")?.rankDelta, 22);
  });

  test("D78 y D81: lectura con rango fallido deja partida con — sin mover baseline; siguiente completa le asigna delta", () => {
    // Lectura parcial: falla el rango, pero se lee LA2_2.
    const partial = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: false },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });
    // Conserva rango, historial y baseline previos; LA2_2 queda con undefined ("—").
    assert.deepStrictEqual(partial.currentRank, baseRank);
    assert.deepStrictEqual(partial.rankHistory, [baseRank]);
    assert.deepStrictEqual(partial.nextBaseline, baseBaseline);
    assert.strictEqual(partial.matches.find((m) => m.id === "LA2_2")?.rankDelta, undefined);

    // Siguiente lectura completa: LA2_2 sigue siendo única partida nueva respecto a baseBaseline.
    const recovered = applyRiotReading({
      previousRank: partial.currentRank,
      previousHistory: partial.rankHistory,
      previousMatches: partial.matches,
      previousBaseline: partial.nextBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 72, { division: "II", recordedAt: T2 }) },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(recovered.matches.find((m) => m.id === "LA2_2")?.rankDelta, 22);
    assert.deepStrictEqual(recovered.nextBaseline, {
      tier: "GOLD",
      division: "II",
      points: 72,
      matchIds: ["LA2_2", "LA2_1"],
    });
  });

  test("D81: si tras lectura parcial llegan 2 partidas nuevas en la completa, la de — sigue con — y luego no cambia", () => {
    const partial = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: false },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });

    const completeWithTwo = applyRiotReading({
      previousRank: partial.currentRank,
      previousHistory: partial.rankHistory,
      previousMatches: partial.matches,
      previousBaseline: partial.nextBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 88, { division: "II", recordedAt: T2 }) },
      matchesResult: {
        ok: true,
        matches: [match("LA2_3", T2), match("LA2_2", T1), baseMatch],
        omittedAny: false,
      },
      isVerification: false,
    });
    assert.strictEqual(completeWithTwo.matches.find((m) => m.id === "LA2_2")?.rankDelta, undefined);
    assert.strictEqual(completeWithTwo.matches.find((m) => m.id === "LA2_3")?.rankDelta, undefined);

    // Una lectura posterior donde LA2_2 ya está en baseline no puede asignarle delta.
    const later = applyRiotReading({
      previousRank: completeWithTwo.currentRank,
      previousHistory: completeWithTwo.rankHistory,
      previousMatches: completeWithTwo.matches,
      previousBaseline: completeWithTwo.nextBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 88, { division: "II", recordedAt: T3 }) },
      matchesResult: {
        ok: true,
        matches: [match("LA2_3", T2), match("LA2_2", T1), baseMatch],
        omittedAny: false,
      },
      isVerification: false,
    });
    assert.strictEqual(later.matches.find((m) => m.id === "LA2_2")?.rankDelta, undefined);
    assert.strictEqual(later.matches.find((m) => m.id === "LA2_3")?.rankDelta, undefined);
  });

  test("D102: lectura con alguna partida omitida no es completa ni mueve baseline; la completa siguiente calcula contra A", () => {
    // Lectura B: rango pasa a 70 LP, pero omitió la partida nueva LA2_2 porque falló su detalle.
    const readingB = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 70, { division: "II", recordedAt: T1 }) },
      matchesResult: { ok: true, matches: [baseMatch], omittedAny: true },
      isVerification: false,
    });
    // Rango e historial sí se actualizan, pero baseline se queda en A (50 LP).
    assert.strictEqual(readingB.currentRank?.points, 70);
    assert.strictEqual(readingB.rankHistory.length, 2);
    assert.deepStrictEqual(readingB.nextBaseline, baseBaseline);

    // Lectura completa C: trae LA2_2 con 70 LP → delta = 70 - 50 = +20 (no +0 contra B).
    const readingC = applyRiotReading({
      previousRank: readingB.currentRank,
      previousHistory: readingB.rankHistory,
      previousMatches: readingB.matches,
      previousBaseline: readingB.nextBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 70, { division: "II", recordedAt: T2 }) },
      matchesResult: { ok: true, matches: [match("LA2_2", T1), baseMatch], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(readingC.matches.find((m) => m.id === "LA2_2")?.rankDelta, 20);
    assert.deepStrictEqual(readingC.nextBaseline, {
      tier: "GOLD",
      division: "II",
      points: 70,
      matchIds: ["LA2_2", "LA2_1"],
    });
  });

  test("lectura con lista de partidas fallida conserva partidas y baseline previos (RF-53, D78)", () => {
    const res = applyRiotReading({
      previousRank: baseRank,
      previousHistory: [baseRank],
      previousMatches: [baseMatch],
      previousBaseline: baseBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 65, { division: "II", recordedAt: T1 }) },
      matchesResult: { ok: false },
      isVerification: false,
    });
    assert.strictEqual(res.currentRank?.points, 65);
    assert.deepStrictEqual(res.matches, [baseMatch]);
    assert.deepStrictEqual(res.nextBaseline, baseBaseline);
  });
});

describe("applyRiotReading — historial de rango (RF-32, D52)", () => {
  test("pasar a sin clasificar conserva historial sin añadir punto; volver al mismo rango no duplica punto (D52)", () => {
    const gold50 = rank("GOLD", 50, { division: "II", recordedAt: T0 });
    const baselineA: RiotLpBaseline = { tier: "GOLD", division: "II", points: 50, matchIds: ["LA2_1"] };

    // Pasa a sin clasificar
    const unranked = applyRiotReading({
      previousRank: gold50,
      previousHistory: [gold50],
      previousMatches: [match("LA2_1", T0)],
      previousBaseline: baselineA,
      rankResult: { ok: true, rank: null },
      matchesResult: { ok: true, matches: [match("LA2_1", T0)], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(unranked.currentRank, null);
    assert.deepStrictEqual(unranked.rankHistory, [gold50]);
    assert.deepStrictEqual(unranked.nextBaseline, { tier: null, matchIds: ["LA2_1"] });

    // Vuelve exactamente a GOLD II 50 LP (mismo del último punto del historial) → NO añade punto (D52).
    const sameAgain = applyRiotReading({
      previousRank: unranked.currentRank,
      previousHistory: unranked.rankHistory,
      previousMatches: unranked.matches,
      previousBaseline: unranked.nextBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 50, { division: "II", recordedAt: T2 }) },
      matchesResult: { ok: true, matches: [match("LA2_2", T2), match("LA2_1", T0)], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(sameAgain.currentRank?.points, 50);
    assert.deepStrictEqual(sameAgain.rankHistory, [gold50]);
    // Además, como la lectura anterior estaba sin clasificar, LA2_2 queda sin delta (RF-30).
    assert.strictEqual(sameAgain.matches.find((m) => m.id === "LA2_2")?.rankDelta, undefined);

    // Cambia a GOLD II 75 LP → sí añade punto.
    const changed = applyRiotReading({
      previousRank: sameAgain.currentRank,
      previousHistory: sameAgain.rankHistory,
      previousMatches: sameAgain.matches,
      previousBaseline: sameAgain.nextBaseline,
      rankResult: { ok: true, rank: rank("GOLD", 75, { division: "II", recordedAt: T3 }) },
      matchesResult: { ok: true, matches: [match("LA2_3", T3), match("LA2_2", T2), match("LA2_1", T0)], omittedAny: false },
      isVerification: false,
    });
    assert.strictEqual(changed.rankHistory.length, 2);
    assert.strictEqual(changed.rankHistory[1]?.points, 75);
  });

  test("no muta las entradas y limita el total de partidas a 20 ordenadas por fecha e id", () => {
    const r0 = rank("GOLD", 40, { division: "II", recordedAt: T0 });
    const saved = Array.from({ length: 18 }, (_, i) =>
      match(`LA2_s_${i}`, new Date(T0.getTime() - i * 60_000)),
    );
    const incoming = Array.from({ length: 5 }, (_, i) =>
      match(`LA2_n_${i}`, new Date(T1.getTime() - i * 60_000)),
    );
    const savedCopy = structuredClone(saved);
    const incomingCopy = structuredClone(incoming);

    const out = applyRiotReading({
      previousRank: r0,
      previousHistory: [r0],
      previousMatches: saved,
      previousBaseline: null,
      rankResult: { ok: true, rank: r0 },
      matchesResult: { ok: true, matches: incoming, omittedAny: false },
      isVerification: false,
    });

    assert.strictEqual(out.matches.length, 20);
    assert.strictEqual(out.matches[0]?.id, "LA2_n_0");
    assert.deepStrictEqual(saved, savedCopy);
    assert.deepStrictEqual(incoming, incomingCopy);
  });
});
