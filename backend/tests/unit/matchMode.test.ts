import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_MODES,
  hasMatchModes,
  modeOfQueue,
  storedMode,
} from "../../src/domain/matchMode.ts";
import type { MatchMode } from "../../src/domain/matchMode.ts";
import { DATA_SOURCE_IDS } from "../../src/domain/sources.ts";
import type { Origin } from "../../src/domain/sources.ts";

// Spec 020, RF-2, RF-3, RF-4, RF-5, RF-16, RNF-4; plan 020, §2.1 (T1).

describe("MATCH_MODES (RF-2, RF-5)", () => {
  test("son los cinco modos, en el orden fijo de las pestañas", () => {
    assert.deepEqual([...MATCH_MODES], ["solo", "flex", "normal", "aram", "other"]);
  });
});

describe("modeOfQueue (RF-2, RF-4)", () => {
  const cases: ReadonlyArray<readonly [number | undefined, MatchMode]> = [
    [420, "solo"],
    [440, "flex"],
    [400, "normal"],
    [430, "normal"],
    [490, "normal"],
    [450, "aram"],
    [1700, "other"], // Arena
    [900, "other"], // URF
    [700, "other"], // Clash
    [0, "other"], // partida personalizada
    [999_999, "other"], // cola desconocida o futura
    [-1, "other"],
    [undefined, "other"], // la partida no informa su cola (RF-4)
  ];
  for (const [queueId, expected] of cases) {
    test(`${String(queueId)} → ${expected}`, () => {
      assert.equal(modeOfQueue(queueId), expected);
    });
  }

  test("un número que no es una cola conocida pero se parece a una (4200, 45) es de «other»", () => {
    assert.equal(modeOfQueue(4200), "other");
    assert.equal(modeOfQueue(45), "other");
  });
});

describe("storedMode (RF-3)", () => {
  test("una partida sin modo se trata como «solo»", () => {
    assert.equal(storedMode(undefined), "solo");
  });

  test("una partida con modo lo conserva, sea cual sea", () => {
    for (const mode of MATCH_MODES) assert.equal(storedMode(mode), mode);
  });
});

describe("hasMatchModes (RF-5, RF-16)", () => {
  test("solo el origen Riot Games tiene modos de partida reales", () => {
    assert.equal(hasMatchModes("riot"), true);
  });

  test("simulado, Steam y Leetify no los tienen", () => {
    const origins: Origin[] = ["simulated", ...DATA_SOURCE_IDS];
    for (const origin of origins) {
      assert.equal(hasMatchModes(origin), origin === "riot", `origen ${origin}`);
    }
  });
});
