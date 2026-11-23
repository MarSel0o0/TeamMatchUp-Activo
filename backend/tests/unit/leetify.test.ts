import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  LEETIFY_ERRORS,
  LEETIFY_NOTICES,
  applyLeetifyReading,
  cs2RealStep,
  parseLeetifyProfile,
  premierSnapshot,
  verifiedPremier,
} from "../../src/domain/leetify.ts";
import type { LeetifyReading, PremierState } from "../../src/domain/leetify.ts";

// Spec 015, RF-2 a RF-5, RF-9, RF-11, RF-14, RF-18, RNF-5; plan, secciones 1, 3 y 4.1.

const NOW = new Date("2026-11-19T12:00:00.000Z");
const LATER = new Date("2026-11-19T13:00:00.000Z");

const profile = (premier: unknown): unknown => ({ ranks: { premier } });

describe("parseLeetifyProfile: con rango (RF-2, D12)", () => {
  test("un entero de 1 a 99999 es con rango", () => {
    assert.deepEqual(parseLeetifyProfile(200, profile(19309)), { kind: "rated", rating: 19309 });
  });

  test("los bordes 1 y 99999 son con rango", () => {
    assert.deepEqual(parseLeetifyProfile(200, profile(1)), { kind: "rated", rating: 1 });
    assert.deepEqual(parseLeetifyProfile(200, profile(99999)), { kind: "rated", rating: 99999 });
  });

  test("ignora el resto del perfil (RNF-3)", () => {
    const body = { name: "x", ranks: { premier: 5000, faceit: 9 }, recent_matches: [{ id: "a" }] };
    assert.deepEqual(parseLeetifyProfile(200, body), { kind: "rated", rating: 5000 });
  });
});

describe("parseLeetifyProfile: sin rango Premier (RF-2, D10, D12)", () => {
  test("0, null o ausente es sin rango Premier", () => {
    assert.deepEqual(parseLeetifyProfile(200, profile(0)), { kind: "unrated" });
    assert.deepEqual(parseLeetifyProfile(200, profile(null)), { kind: "unrated" });
    assert.deepEqual(parseLeetifyProfile(200, { ranks: {} }), { kind: "unrated" });
  });

  test("sin `ranks` o con `ranks` nulo es sin rango Premier", () => {
    assert.deepEqual(parseLeetifyProfile(200, {}), { kind: "unrated" });
    assert.deepEqual(parseLeetifyProfile(200, { ranks: null }), { kind: "unrated" });
  });

  test("un perfil inexistente (404) es sin rango Premier, no un fallo (D10)", () => {
    assert.deepEqual(parseLeetifyProfile(404, undefined), { kind: "unrated" });
    assert.deepEqual(parseLeetifyProfile(404, { message: "not found" }), { kind: "unrated" });
  });
});

describe("parseLeetifyProfile: fallo (RF-2, RF-14, D13, D24)", () => {
  test("un estado distinto de 200 y 404 es fallo: clave, límite y caída", () => {
    for (const status of [401, 403, 429, 500, 502, 503]) {
      assert.deepEqual(parseLeetifyProfile(status, profile(19309)), { kind: "failed" }, String(status));
    }
  });

  test("un rating negativo, decimal o mayor que 99999 es fallo", () => {
    for (const rating of [-1, 12.5, 100000, Number.NaN, Number.POSITIVE_INFINITY]) {
      assert.deepEqual(parseLeetifyProfile(200, profile(rating)), { kind: "failed" }, String(rating));
    }
  });

  test("un rating que no es número es fallo", () => {
    for (const rating of ["19309", true, [19309], { value: 1 }]) {
      assert.deepEqual(parseLeetifyProfile(200, profile(rating)), { kind: "failed" });
    }
  });

  test("un cuerpo que no es un objeto es fallo", () => {
    for (const body of [undefined, null, "x", 7, [], [{ ranks: { premier: 1 } }]]) {
      assert.deepEqual(parseLeetifyProfile(200, body), { kind: "failed" });
    }
  });

  test("`ranks` que no es un objeto es fallo", () => {
    for (const ranks of [3, "x", true, [{ premier: 5000 }]]) {
      assert.deepEqual(parseLeetifyProfile(200, { ranks }), { kind: "failed" });
    }
  });
});

describe("cs2RealStep (RF-4, RF-5, D2)", () => {
  test("cada escalón empieza en su múltiplo de 5000", () => {
    const expected: [number, number][] = [
      [0, 0],
      [4999, 0],
      [5000, 1],
      [9999, 1],
      [10000, 2],
      [14999, 2],
      [15000, 3],
      [19999, 3],
      [20000, 4],
      [24999, 4],
      [25000, 5],
      [29999, 5],
      [30000, 6],
    ];
    for (const [rating, step] of expected) assert.equal(cs2RealStep(rating), step, String(rating));
  });

  test("Gold no tiene tope: 35000 y 99999 siguen siendo Gold", () => {
    assert.equal(cs2RealStep(34999), 6);
    assert.equal(cs2RealStep(35000), 6);
    assert.equal(cs2RealStep(99999), 6);
  });

  test("rechaza un rating negativo o decimal", () => {
    assert.throws(() => cs2RealStep(-1), RangeError);
    assert.throws(() => cs2RealStep(10.5), RangeError);
  });
});

describe("premierSnapshot (RF-4, RF-5)", () => {
  test("Gold con el rating exacto y normalizado 100, también por encima de 34999", () => {
    const snapshot = premierSnapshot(36210, NOW);
    assert.deepEqual(snapshot, { tier: "Gold", points: 36210, normalized: 100, recordedAt: NOW });
    assert.equal("division" in snapshot, false);
  });

  test("el normalizado sigue la regla de la 004: round(escalón · 100 / 6)", () => {
    const expected: [number, string, number][] = [
      [1, "Grey", 0],
      [5000, "Light Blue", 17],
      [10000, "Blue", 33],
      [15000, "Purple", 50],
      [20000, "Pink", 67],
      [25000, "Red", 83],
      [30000, "Gold", 100],
    ];
    for (const [rating, tier, normalized] of expected) {
      const snapshot = premierSnapshot(rating, NOW);
      assert.equal(snapshot.tier, tier, String(rating));
      assert.equal(snapshot.normalized, normalized, String(rating));
      assert.equal(snapshot.points, rating);
    }
  });
});

describe("verifiedPremier: al verificar se descarta lo simulado y no se guarda historial (RF-3, RF-11, RF-15, D27)", () => {
  test("con rango: rango vigente con el rating y historial vacío (D27)", () => {
    const state = verifiedPremier({ kind: "rated", rating: 19309 }, NOW);
    assert.deepEqual(state, { premier: "rated", currentRank: premierSnapshot(19309, NOW), rankHistory: [] });
  });

  test("sin rango Premier: sin rango y sin historial", () => {
    assert.deepEqual(verifiedPremier({ kind: "unrated" }, NOW), {
      premier: "unrated",
      currentRank: null,
      rankHistory: [],
    });
  });

  test("fallo: rango no disponible y sin historial", () => {
    assert.deepEqual(verifiedPremier({ kind: "failed" }, NOW), {
      premier: "unavailable",
      currentRank: null,
      rankHistory: [],
    });
  });
});

describe("applyLeetifyReading: al resincronizar, sin historial (RF-9, RF-11, RF-18, D27)", () => {
  // D27: el historial de una cuenta de CS2 verificada es siempre `[]`; ninguna transición agrega puntos.
  const rated = (rating: number, at: Date = NOW): PremierState => ({
    premier: "rated",
    currentRank: premierSnapshot(rating, at),
    rankHistory: [],
  });
  const unrated: PremierState = { premier: "unrated", currentRank: null, rankHistory: [] };
  const unavailable: PremierState = { premier: "unavailable", currentRank: null, rankHistory: [] };
  const reading = (rating: number): LeetifyReading => ({ kind: "rated", rating });

  test("con rating distinto: el rango vigente toma la lectura y el historial sigue vacío (RF-11, D27)", () => {
    const next = applyLeetifyReading(rated(19309), reading(19500), LATER);
    assert.deepEqual(next, { premier: "rated", currentRank: premierSnapshot(19500, LATER), rankHistory: [] });
  });

  test("con un rating más bajo (datos atrasados): rango nuevo e historial vacío (RF-11, D27)", () => {
    const next = applyLeetifyReading(rated(19309), reading(18000), LATER);
    assert.equal(next.currentRank?.points, 18000);
    assert.deepEqual(next.rankHistory, []);
  });

  test("con el mismo rating: el rango vigente toma la lectura nueva y el historial sigue vacío", () => {
    const next = applyLeetifyReading(rated(19309), reading(19309), LATER);
    assert.deepEqual(next, { premier: "rated", currentRank: premierSnapshot(19309, LATER), rankHistory: [] });
  });

  test("con rango aunque el estado previo traiga puntos (cuenta sin migrar): el historial queda vacío (D27)", () => {
    const legacy: PremierState = { ...rated(19309), rankHistory: [premierSnapshot(19309, NOW)] };
    assert.deepEqual(applyLeetifyReading(legacy, reading(19500), LATER).rankHistory, []);
  });

  test("sin rango Premier tras tener rating: el rating se borra y no queda historial (RF-9, D27)", () => {
    const next = applyLeetifyReading(rated(19309), { kind: "unrated" }, LATER);
    assert.deepEqual(next, { premier: "unrated", currentRank: null, rankHistory: [] });
  });

  test("sin rango Premier tras tener rating y puntos heredados: también se vacía el historial (D27)", () => {
    const legacy: PremierState = { ...rated(19309), rankHistory: [premierSnapshot(19309, NOW)] };
    assert.deepEqual(applyLeetifyReading(legacy, { kind: "unrated" }, LATER).rankHistory, []);
  });

  test("sin rango Premier de nuevo no cambia nada (RF-11)", () => {
    assert.deepEqual(applyLeetifyReading(unrated, { kind: "unrated" }, LATER), unrated);
  });

  test("sin rango Premier desde rango no disponible pasa a sin rango Premier", () => {
    assert.deepEqual(applyLeetifyReading(unavailable, { kind: "unrated" }, LATER), unrated);
  });

  test("con rango desde sin rango Premier: rango vigente e historial vacío (D27)", () => {
    const next = applyLeetifyReading(unrated, reading(19309), LATER);
    assert.deepEqual(next, { premier: "rated", currentRank: premierSnapshot(19309, LATER), rankHistory: [] });
  });

  test("con rango desde rango no disponible: rango vigente e historial vacío (D27)", () => {
    const next = applyLeetifyReading(unavailable, reading(36210), LATER);
    assert.deepEqual(next, { premier: "rated", currentRank: premierSnapshot(36210, LATER), rankHistory: [] });
  });

  test("un fallo nunca cambia el estado, sea cual sea (RF-18)", () => {
    for (const state of [rated(19309), unrated, unavailable]) {
      assert.deepEqual(applyLeetifyReading(state, { kind: "failed" }, LATER), state);
    }
  });

  test("no muta el estado de entrada", () => {
    const state = rated(19309);
    const before = structuredClone(state);
    applyLeetifyReading(state, reading(25000), LATER);
    applyLeetifyReading(state, { kind: "unrated" }, LATER);
    applyLeetifyReading(state, { kind: "failed" }, LATER);
    assert.deepEqual(state, before);
  });
});

describe("textos (RF-10, RF-15, RF-16, RNF-5)", () => {
  test("los textos de la spec, tal cual", () => {
    assert.equal(LEETIFY_NOTICES.verifyFailed, "Leetify no responde: tu rango Premier se obtendrá al resincronizar");
    assert.equal(
      LEETIFY_NOTICES.syncFailed,
      "Leetify no está disponible por ahora: tu rango Premier no se actualizó",
    );
    assert.equal(
      LEETIFY_ERRORS.noPremierForMatches,
      "tu cuenta de CS2 no tiene rango Premier: resincronízala cuando lo tengas en Leetify",
    );
    assert.equal(
      LEETIFY_ERRORS.premierUnavailableForMatches,
      "tu cuenta de CS2 tiene el rango no disponible: resincronízala",
    );
  });

  test("en minúscula y sin punto final, salvo los que empiezan por Leetify", () => {
    for (const text of [...Object.values(LEETIFY_NOTICES), ...Object.values(LEETIFY_ERRORS)]) {
      assert.equal(text.endsWith("."), false, text);
      const first = text[0] ?? "";
      assert.equal(text.startsWith("Leetify") || first === first.toLowerCase(), true, text);
    }
  });
});
