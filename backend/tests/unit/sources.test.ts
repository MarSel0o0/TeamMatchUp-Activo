import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DATA_SOURCE_IDS, SOURCE_BLOCKS, SOURCE_IDS, SOURCE_NAMES, blockOrigins } from "../../src/domain/sources.ts";

// Spec 012, RF-5, RF-7, RF-8; plan, sección 1 (`domain/sources.ts`).
// Spec 015, RF-6, RF-13, RF-22; plan, P15-7: el rango de CS2 verificado lo entrega Leetify.

describe("blockOrigins (RF-5, RF-8)", () => {
  test("sin verificación todos los bloques son simulados (RF-2)", () => {
    const simulated = { identity: "simulated", rank: "simulated", matches: "simulated", profile: "simulated" };
    assert.deepEqual(blockOrigins(undefined), simulated);
    assert.deepEqual(blockOrigins(null), simulated);
  });

  test("Steam entrega identidad y perfil, el rango es de Leetify y las partidas siguen simuladas (spec 015, RF-6, RF-13)", () => {
    assert.deepEqual(blockOrigins({ source: "steam" }), {
      identity: "steam",
      rank: "leetify",
      matches: "simulated",
      profile: "steam",
    });
  });

  test("una cuenta sin verificar nunca lleva Leetify (spec 015, RF-22)", () => {
    for (const origin of Object.values(blockOrigins(undefined))) assert.equal(origin, "simulated");
  });

  test("Riot nunca lleva Leetify (spec 015, RF-6)", () => {
    for (const origin of Object.values(blockOrigins({ source: "riot" }))) assert.notEqual(origin, "leetify");
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
        // Spec 015: el rango de Steam no lo entrega Steam sino Leetify (P15-7).
        const expected = delivered ? source : source === "steam" && block === "rank" ? "leetify" : "simulated";
        assert.equal(origin, expected, `${source}/${block}`);
      }
    }
  });
});

describe("fuentes de verificación y orígenes de datos (spec 015, P15-7)", () => {
  test("Leetify es un origen de datos, no una fuente de verificación", () => {
    assert.deepEqual([...SOURCE_IDS], ["steam", "riot"]);
    assert.deepEqual([...DATA_SOURCE_IDS], ["steam", "riot", "leetify"]);
  });
});

describe("SOURCE_NAMES", () => {
  test("nombres que ve el usuario", () => {
    assert.deepEqual(SOURCE_NAMES, { steam: "Steam", riot: "Riot Games", leetify: "Leetify" });
  });
});
