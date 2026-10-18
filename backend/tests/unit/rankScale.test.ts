import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { GAMES, GAME_IDS, isGameId } from "../../src/domain/games.ts";
import type { GameId } from "../../src/domain/games.ts";
import {
  generationRange,
  ladder,
  normalizeRank,
  normalizeStep,
  pointsBand,
  stepIndexOf,
} from "../../src/domain/rankScale.ts";
import * as gamesModule from "../../src/domain/games.ts";

// Spec 004, DP-2, DP-26, DP-34 y RF-36; plan, sección 3.

describe("catálogo de juegos del backend", () => {
  test("tres juegos, sin fuente ni color", () => {
    assert.deepEqual([...GAME_IDS].sort(), ["cs2", "lol", "r6"]);
    for (const gameId of GAME_IDS) {
      const game: object = GAMES[gameId];
      assert.equal("source" in game, false, gameId);
      assert.equal("accent" in game, false, gameId);
    }
  });

  test("no exporta la normalizeRank antigua", () => {
    assert.equal("normalizeRank" in gamesModule, false);
  });

  test("isGameId solo acepta los tres juegos", () => {
    for (const gameId of ["lol", "r6", "cs2"]) assert.equal(isGameId(gameId), true, gameId);
    for (const value of ["LOL", "", " lol", "toString", "valorant", 3, null, undefined]) {
      assert.equal(isGameId(value), false, String(value));
    }
  });
});

describe("escalones (DP-2, DP-26)", () => {
  test("tamaños: LoL 31, CS2 7, R6 36", () => {
    assert.equal(ladder("lol").length, 31);
    assert.equal(ladder("cs2").length, 7);
    assert.equal(ladder("r6").length, 36);
  });

  test("LoL: Iron IV primero, Diamond I en 27, Master, Grandmaster y Challenger sin división", () => {
    const steps = ladder("lol");
    assert.deepEqual(steps[0], { tier: "Iron", division: "IV" });
    assert.deepEqual(steps[3], { tier: "Iron", division: "I" });
    assert.deepEqual(steps[4], { tier: "Bronze", division: "IV" });
    assert.deepEqual(steps[27], { tier: "Diamond", division: "I" });
    assert.deepEqual(steps[28], { tier: "Master" });
    assert.deepEqual(steps[29], { tier: "Grandmaster" });
    assert.deepEqual(steps[30], { tier: "Challenger" });
    assert.equal("division" in (steps[28] ?? {}), false);
  });

  test("CS2: Grey a Gold sin división", () => {
    assert.deepEqual(ladder("cs2"), [
      { tier: "Grey" },
      { tier: "Light Blue" },
      { tier: "Blue" },
      { tier: "Purple" },
      { tier: "Pink" },
      { tier: "Red" },
      { tier: "Gold" },
    ]);
  });

  test("R6: Copper V primero, Diamond I en 34, Champion sin división", () => {
    const steps = ladder("r6");
    assert.deepEqual(steps[0], { tier: "Copper", division: "V" });
    assert.deepEqual(steps[4], { tier: "Copper", division: "I" });
    assert.deepEqual(steps[5], { tier: "Bronze", division: "V" });
    assert.deepEqual(steps[34], { tier: "Diamond", division: "I" });
    assert.deepEqual(steps[35], { tier: "Champion" });
  });

  test("stepIndexOf: null si el tier no existe; división ausente o desconocida = la más baja", () => {
    assert.equal(stepIndexOf("lol", "Wood"), null);
    assert.equal(stepIndexOf("lol", "iron", "IV"), null);
    assert.equal(stepIndexOf("lol", "Gold"), 12);
    assert.equal(stepIndexOf("lol", "Gold", "X"), 12);
    assert.equal(stepIndexOf("lol", "Gold", "II"), 14);
    assert.equal(stepIndexOf("lol", "Master", "I"), 28);
    assert.equal(stepIndexOf("cs2", "Grey", "II"), 0);
    assert.equal(stepIndexOf("r6", "Champion", "V"), 35);
    assert.equal(stepIndexOf("r6", "Diamond", "I"), 34);
  });

  test("cada escalón vuelve a su propia posición", () => {
    for (const gameId of GAME_IDS) {
      ladder(gameId).forEach((step, index) => {
        assert.equal(stepIndexOf(gameId, step.tier, step.division), index, `${gameId} ${index}`);
      });
    }
  });
});

describe("normalización (DP-26, criterios de la spec)", () => {
  const cases: [GameId, string, string | undefined, number][] = [
    ["lol", "Iron", "IV", 0],
    ["lol", "Diamond", "I", 90],
    ["lol", "Master", undefined, 93],
    ["lol", "Grandmaster", undefined, 97],
    ["lol", "Challenger", undefined, 100],
    ["cs2", "Grey", undefined, 0],
    ["cs2", "Light Blue", undefined, 17],
    ["cs2", "Purple", undefined, 50],
    ["cs2", "Gold", undefined, 100],
    ["r6", "Copper", "V", 0],
    ["r6", "Diamond", "I", 97],
    ["r6", "Champion", undefined, 100],
    // División en un tier sin divisiones: se ignora.
    ["lol", "Master", "I", 93],
    ["cs2", "Grey", "II", 0],
    ["r6", "Champion", "V", 100],
    // Tier inexistente: 0.
    ["lol", "Wood", "I", 0],
    ["cs2", "Silver", undefined, 0],
    ["r6", "Master", undefined, 0],
  ];
  for (const [gameId, tier, division, expected] of cases) {
    test(`${gameId} ${tier}${division === undefined ? "" : ` ${division}`} = ${expected}`, () => {
      assert.equal(normalizeRank(gameId, tier, division), expected);
    });
  }

  test("división ausente o desconocida = la más baja del tier", () => {
    assert.equal(normalizeRank("lol", "Diamond"), normalizeRank("lol", "Diamond", "IV"));
    assert.equal(normalizeRank("lol", "Diamond", "V"), normalizeRank("lol", "Diamond", "IV"));
    assert.equal(normalizeRank("r6", "Gold"), normalizeRank("r6", "Gold", "V"));
    assert.equal(normalizeRank("r6", "Gold", "VI"), normalizeRank("r6", "Gold", "V"));
    assert.equal(normalizeRank("lol", "Diamond"), 80);
  });

  test("normalizeStep = round(paso * 100 / (tamaño - 1)) y coincide con normalizeRank", () => {
    for (const gameId of GAME_IDS) {
      const steps = ladder(gameId);
      steps.forEach((step, index) => {
        const expected = Math.round((index * 100) / (steps.length - 1));
        assert.equal(normalizeStep(gameId, index), expected, `${gameId} ${index}`);
        assert.equal(normalizeRank(gameId, step.tier, step.division), expected, `${gameId} ${index}`);
      });
    }
  });

  test("normalizeStep rechaza posiciones fuera de la escala", () => {
    assert.throws(() => normalizeStep("cs2", -1), RangeError);
    assert.throws(() => normalizeStep("cs2", 7), RangeError);
    assert.throws(() => normalizeStep("lol", 1.5), RangeError);
  });
});

describe("bandas de puntos y rango de generación (DP-34, plan sección 3)", () => {
  test("LoL: 0–99 con división; Master+ ≥ 0 y genera 0–999", () => {
    for (let i = 0; i <= 27; i++) {
      assert.deepEqual(pointsBand("lol", i), { min: 0, max: 99 }, `${i}`);
      assert.deepEqual(generationRange("lol", i), { min: 0, max: 99 }, `${i}`);
    }
    for (const i of [28, 29, 30]) {
      assert.deepEqual(pointsBand("lol", i), { min: 0, max: null }, `${i}`);
      assert.deepEqual(generationRange("lol", i), { min: 0, max: 999 }, `${i}`);
    }
  });

  test("CS2: bandas de 5000; Gold ≥ 30000 y genera 30000–34999", () => {
    const expected: [number, number][] = [
      [0, 4999],
      [5000, 9999],
      [10000, 14999],
      [15000, 19999],
      [20000, 24999],
      [25000, 29999],
    ];
    expected.forEach(([min, max], i) => {
      assert.deepEqual(pointsBand("cs2", i), { min, max }, `${i}`);
      assert.deepEqual(generationRange("cs2", i), { min, max }, `${i}`);
    });
    assert.deepEqual(pointsBand("cs2", 6), { min: 30000, max: null });
    assert.deepEqual(generationRange("cs2", 6), { min: 30000, max: 34999 });
  });

  test("R6: 100 por división desde Copper V 1000–1099; Champion ≥ 4500 y genera 4500–4999", () => {
    for (let i = 0; i <= 34; i++) {
      const min = 1000 + 100 * i;
      assert.deepEqual(pointsBand("r6", i), { min, max: min + 99 }, `${i}`);
      assert.deepEqual(generationRange("r6", i), { min, max: min + 99 }, `${i}`);
    }
    assert.deepEqual(pointsBand("r6", 0), { min: 1000, max: 1099 });
    assert.deepEqual(pointsBand("r6", 4), { min: 1400, max: 1499 });
    assert.deepEqual(pointsBand("r6", 34), { min: 4400, max: 4499 });
    assert.deepEqual(pointsBand("r6", 35), { min: 4500, max: null });
    assert.deepEqual(generationRange("r6", 35), { min: 4500, max: 4999 });
  });

  test("el rango de generación siempre está dentro de la banda", () => {
    for (const gameId of GAME_IDS) {
      ladder(gameId).forEach((_step, i) => {
        const band = pointsBand(gameId, i);
        const range = generationRange(gameId, i);
        assert.ok(Number.isInteger(range.min) && Number.isInteger(range.max), `${gameId} ${i}`);
        assert.ok(range.min <= range.max, `${gameId} ${i}`);
        assert.ok(range.min >= band.min, `${gameId} ${i}`);
        assert.ok(band.max === null || range.max <= band.max, `${gameId} ${i}`);
      });
    }
  });

  test("bandas y rangos rechazan posiciones fuera de la escala", () => {
    assert.throws(() => pointsBand("lol", 31), RangeError);
    assert.throws(() => generationRange("r6", -1), RangeError);
  });
});
