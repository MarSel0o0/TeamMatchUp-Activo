import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { SOURCE_BLOCKS, SOURCE_NAMES, blockOrigins } from "../../src/domain/sources.ts";

// Spec 012, RF-5, RF-7, RF-8; plan, sección 1 (`domain/sources.ts`).

describe("blockOrigins (RF-5, RF-8)", () => {
  test("sin verificación todos los bloques son simulados (RF-2)", () => {
    const simulated = { identity: "simulated", rank: "simulated", matches: "simulated", profile: "simulated" };
    assert.deepEqual(blockOrigins(undefined), simulated);
    assert.deepEqual(blockOrigins(null), simulated);
  });

  test("Steam entrega identidad y perfil; rango y partidas siguen simulados (RF-8)", () => {
    assert.deepEqual(blockOrigins({ source: "steam" }), {
      identity: "steam",
      rank: "simulated",
      matches: "simulated",
      profile: "steam",
    });
  });

  test("Riot entrega los cuatro bloques", () => {
    assert.deepEqual(blockOrigins({ source: "riot" }), {
      identity: "riot",
      rank: "riot",
      matches: "riot",
      profile: "riot",
    });
  });

  test("nunca atribuye a una fuente un bloque que ella no entrega (RF-7)", () => {
    for (const source of ["steam", "riot"] as const) {
      const origins = blockOrigins({ source });
      for (const [block, origin] of Object.entries(origins)) {
        const delivered = SOURCE_BLOCKS[source].some((name) => name === block);
        assert.equal(origin, delivered ? source : "simulated", `${source}/${block}`);
      }
    }
  });
});

describe("SOURCE_NAMES", () => {
  test("nombres que ve el usuario", () => {
    assert.deepEqual(SOURCE_NAMES, { steam: "Steam", riot: "Riot Games" });
  });
});
