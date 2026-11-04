import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  AVAILABILITY_MESSAGES,
  TIME_BLOCK_PATTERN,
  isTimeBlock,
  validateAvailability,
} from "../../src/services/availability.ts";
import {
  compareBlocks,
  intersectBlocks,
  parseBlock,
} from "../../src/domain/availability.ts";

function okValue(body: unknown): string[] {
  const result = validateAvailability(body);
  assert.ok(result.ok, `se esperaba ok y llegó: ${result.ok ? "" : result.error}`);
  return result.value;
}

function errorOf(body: unknown): string {
  const result = validateAvailability(body);
  assert.ok(!result.ok, "se esperaba un error");
  return result.error;
}

describe("isTimeBlock (Definiciones, RF-14)", () => {
  test("bloques válidos", () => {
    for (const block of ["0-0", "6-23", "2-20", "0-9", "3-10", "6-19", "5-1"]) {
      assert.equal(isTimeBlock(block), true, block);
    }
  });

  test("cada día de 0 a 6 y cada hora de 0 a 23 forman un bloque", () => {
    for (let day = 0; day <= 6; day += 1) {
      for (let hour = 0; hour <= 23; hour += 1) {
        assert.equal(isTimeBlock(`${day}-${hour}`), true, `${day}-${hour}`);
      }
    }
  });

  test("textos inválidos de los casos límite y otros (sin recortar)", () => {
    const invalid = [
      "2-05",
      "7-10",
      "2-24",
      " 2-20",
      "2-20 ",
      "+2-5",
      "-0-5",
      "2-20\n",
      "\n2-20",
      "2 -20",
      "2- 20",
      "02-5",
      "00-0",
      "2-00",
      "2-+5",
      "2--5",
      "2_20",
      "2:20",
      "220",
      "2-",
      "-20",
      "",
      " ",
      "2-20-1",
      "a-b",
      "2-2a",
      "٢-٢٠",
      "2 -20",
      "2-20 ",
    ];
    for (const block of invalid) {
      assert.equal(isTimeBlock(block), false, JSON.stringify(block));
    }
  });

  test("un valor que no es texto nunca es un bloque", () => {
    for (const value of [20, 2.2, null, undefined, {}, [], ["2-20"], true, { toString: () => "2-20" }]) {
      assert.equal(isTimeBlock(value), false, String(value));
    }
  });
});

describe("validateAvailability: falta el campo (RF-14)", () => {
  const cases: [string, unknown][] = [
    ["sin cuerpo (undefined)", undefined],
    ["null", null],
    ["{}", {}],
    ["lista JSON", [{ blocks: ["2-20"] }]],
    ["lista JSON de bloques", ["2-20"]],
    ["lista vacía", []],
    ["texto (text/plain no interpretado)", "blocks=2-20"],
    ["número", 5],
    ["solo otros campos", { user: "aaaaaaaaaaaaaaaaaaaaaaaa", availability: ["2-20"] }],
    ["blocks heredado y no propio", Object.create({ blocks: ["2-20"] }) as unknown],
  ];
  for (const [name, body] of cases) {
    test(name, () => {
      assert.equal(errorOf(body), AVAILABILITY_MESSAGES.blocksMissing);
    });
  }
});

describe("validateAvailability: blocks no es una lista (RF-14)", () => {
  const cases: [string, unknown][] = [
    ["texto", "2-20"],
    ["null", null],
    ["objeto", {}],
    ["número", 5],
    ["booleano", false],
    ["texto vacío", ""],
    ["objeto con forma de lista", { 0: "2-20", length: 1 }],
  ];
  for (const [name, blocks] of cases) {
    test(name, () => {
      assert.equal(errorOf({ blocks }), AVAILABILITY_MESSAGES.blocksNotList);
    });
  }
});

describe("validateAvailability: elemento inválido (RF-14)", () => {
  test("un elemento numérico", () => {
    assert.equal(errorOf({ blocks: ["2-20", 5] }), AVAILABILITY_MESSAGES.blockInvalid);
  });

  test("cada inválido de los casos límite, solo o junto a válidos", () => {
    for (const bad of ["2-05", "7-10", "2-24", " 2-20", "2-20 ", "+2-5", "-0-5", 20, null, {}, "2-20\n"]) {
      assert.equal(errorOf({ blocks: [bad] }), AVAILABILITY_MESSAGES.blockInvalid, JSON.stringify(bad));
      assert.equal(errorOf({ blocks: ["0-0", bad, "6-23"] }), AVAILABILITY_MESSAGES.blockInvalid, JSON.stringify(bad));
    }
  });

  test("lista anidada", () => {
    assert.equal(errorOf({ blocks: [["2-20"]] }), AVAILABILITY_MESSAGES.blockInvalid);
  });

  test("repetidos con algún inválido: error y nada que guardar", () => {
    const result = validateAvailability({ blocks: ["3-10", "3-10", "1-5", "1-05"] });
    assert.deepEqual(result, { ok: false, error: AVAILABILITY_MESSAGES.blockInvalid });
  });
});

describe("validateAvailability: bloques válidos (RF-13)", () => {
  test("lista vacía es válida", () => {
    assert.deepEqual(okValue({ blocks: [] }), []);
  });

  test("quita repetidos conservando el orden de primera aparición", () => {
    assert.deepEqual(okValue({ blocks: ["3-10", "1-5", "3-10"] }), ["3-10", "1-5"]);
    assert.deepEqual(okValue({ blocks: ["6-23", "0-0", "6-23", "0-0", "2-20"] }), ["6-23", "0-0", "2-20"]);
  });

  test("no reordena", () => {
    assert.deepEqual(okValue({ blocks: ["6-23", "0-0", "2-20"] }), ["6-23", "0-0", "2-20"]);
  });

  test("ignora user y cualquier otro campo (RNF-1)", () => {
    const body = { blocks: ["2-20"], user: "aaaaaaaaaaaaaaaaaaaaaaaa", availability: ["0-0"], id: "x" };
    assert.deepEqual(okValue(body), ["2-20"]);
  });

  test("devuelve una lista nueva sin modificar la recibida", () => {
    const blocks = ["3-10", "1-5", "3-10"];
    const value = okValue({ blocks });
    assert.notEqual(value, blocks);
    assert.deepEqual(blocks, ["3-10", "1-5", "3-10"]);
  });

  test("5 000 bloques válidos: sin tope de elementos", () => {
    const blocks = Array.from({ length: 5000 }, (_, i) => `${i % 7}-${i % 24}`);
    const value = okValue({ blocks });
    assert.deepEqual(value, [...new Set(blocks)]);
    assert.equal(value.length, 168);
  });

  test("5 000 bloques iguales se reducen a uno", () => {
    assert.deepEqual(okValue({ blocks: Array.from({ length: 5000 }, () => "2-20") }), ["2-20"]);
  });
});

describe("orden de los errores (RF-14)", () => {
  test("falta antes que no lista antes que inválido", () => {
    assert.equal(errorOf({}), AVAILABILITY_MESSAGES.blocksMissing);
    assert.equal(errorOf({ blocks: "x" }), AVAILABILITY_MESSAGES.blocksNotList);
    assert.equal(errorOf({ blocks: ["x"] }), AVAILABILITY_MESSAGES.blockInvalid);
  });
});

describe("constantes y mensajes (RNF-3, RNF-4)", () => {
  test("patrón del bloque", () => {
    assert.equal(TIME_BLOCK_PATTERN.source, "^[0-6]-(?:[0-9]|1[0-9]|2[0-3])$");
    assert.equal(TIME_BLOCK_PATTERN.flags, "");
  });

  test("textos literales de la spec", () => {
    assert.deepEqual(AVAILABILITY_MESSAGES, {
      blocksMissing: "faltan los bloques",
      blocksNotList: "los bloques deben ser una lista",
      blockInvalid: "hay un bloque horario con formato inválido",
    });
  });

  test("cada mensaje en minúscula, sin espacios extremos y sin punto final", () => {
    for (const [key, message] of Object.entries(AVAILABILITY_MESSAGES)) {
      assert.match(message, /^\p{Ll}/u, key);
      assert.ok(!message.endsWith("."), key);
      assert.equal(message, message.trim(), key);
      assert.equal(message, message.toLowerCase(), key);
    }
  });
});

// Spec 005 (RF-3 bloques, DP5-9, RNF-1): reglas puras de `domain/availability.ts`.
describe("parseBlock (domain, DP5-9)", () => {
  test("devuelve día y hora de un bloque válido", () => {
    assert.deepEqual(parseBlock("0-0"), { day: 0, hour: 0 });
    assert.deepEqual(parseBlock("6-23"), { day: 6, hour: 23 });
    assert.deepEqual(parseBlock("2-20"), { day: 2, hour: 20 });
    assert.deepEqual(parseBlock("0-5"), { day: 0, hour: 5 });
    assert.deepEqual(parseBlock("3-10"), { day: 3, hour: 10 });
  });

  test("cada día 0..6 y cada hora 0..23 se leen como números", () => {
    for (let day = 0; day <= 6; day += 1) {
      for (let hour = 0; hour <= 23; hour += 1) {
        assert.deepEqual(parseBlock(`${day}-${hour}`), { day, hour });
      }
    }
  });

  test("null si no cumple el formato (sin recortar ni aceptar ceros, signos o saltos)", () => {
    const invalid = [
      "",
      "2-05",
      "02-5",
      "7-10",
      "2-24",
      "2-",
      "-5",
      "2_5",
      "2-5 ",
      " 2-5",
      "2-5\n",
      "+2-5",
      "2--5",
      "a-b",
      "2-5-1",
      "2-1.5",
      "２-５",
      "lunes",
    ];
    for (const block of invalid) {
      assert.equal(parseBlock(block), null, JSON.stringify(block));
    }
  });
});

describe("compareBlocks (domain, DP5-9)", () => {
  test("día ascendente y, dentro del día, hora ascendente", () => {
    assert.ok(compareBlocks("0-5", "1-0") < 0);
    assert.ok(compareBlocks("1-0", "0-5") > 0);
    assert.ok(compareBlocks("2-3", "2-20") < 0);
    assert.ok(compareBlocks("2-20", "2-3") > 0);
  });

  test("numérico, no alfabético: 0-5 antes que 0-23 y 0-9 antes que 0-10", () => {
    assert.ok(compareBlocks("0-5", "0-23") < 0);
    assert.ok(compareBlocks("0-23", "0-5") > 0);
    assert.ok(compareBlocks("0-9", "0-10") < 0);
  });

  test("bloques iguales dan 0", () => {
    assert.equal(compareBlocks("4-12", "4-12"), 0);
  });

  test("ordena una lista de menor a mayor", () => {
    assert.deepEqual(["6-0", "0-23", "0-5", "2-20"].sort(compareBlocks), [
      "0-5",
      "0-23",
      "2-20",
      "6-0",
    ]);
  });
});

describe("intersectBlocks (domain, DP5-9)", () => {
  test("sin traslape: lista vacía", () => {
    assert.deepEqual(intersectBlocks(["0-1", "0-2"], ["1-1", "1-2"]), []);
    assert.deepEqual(intersectBlocks(["0-1"], ["0-2"]), []);
  });

  test("traslape parcial: solo los bloques presentes en ambas", () => {
    assert.deepEqual(intersectBlocks(["0-1", "0-2", "3-4"], ["0-2", "3-4", "5-6"]), [
      "0-2",
      "3-4",
    ]);
  });

  test("traslape total", () => {
    assert.deepEqual(intersectBlocks(["1-1", "2-2"], ["2-2", "1-1"]), ["1-1", "2-2"]);
  });

  test("listas vacías: una, otra o ambas", () => {
    assert.deepEqual(intersectBlocks([], []), []);
    assert.deepEqual(intersectBlocks(["0-1"], []), []);
    assert.deepEqual(intersectBlocks([], ["0-1"]), []);
  });

  test("repetidos en la entrada no se repiten en la salida", () => {
    assert.deepEqual(intersectBlocks(["0-1", "0-1", "0-1"], ["0-1", "0-1"]), ["0-1"]);
    assert.deepEqual(intersectBlocks(["2-3", "2-3", "1-1"], ["1-1", "2-3", "2-3"]), [
      "1-1",
      "2-3",
    ]);
  });

  test("entradas desordenadas: salida por día y hora numérico (0-5 antes que 0-23)", () => {
    const blocks = ["6-0", "0-23", "0-5", "2-20"];
    assert.deepEqual(intersectBlocks(blocks, blocks), ["0-5", "0-23", "2-20", "6-0"]);
    assert.deepEqual(intersectBlocks(blocks, [...blocks].reverse()), [
      "0-5",
      "0-23",
      "2-20",
      "6-0",
    ]);
  });

  test("el resultado es el mismo al intercambiar los argumentos", () => {
    const a = ["3-9", "0-23", "0-5", "6-6", "3-10"];
    const b = ["6-6", "3-10", "0-5", "1-1"];
    assert.deepEqual(intersectBlocks(a, b), intersectBlocks(b, a));
    assert.deepEqual(intersectBlocks(a, b), ["0-5", "3-10", "6-6"]);
  });

  test("texto que no es bloque se ignora, aunque esté en ambas listas", () => {
    assert.deepEqual(
      intersectBlocks(["lunes", "2-05", "7-1", "", "0-5"], ["lunes", "2-05", "7-1", "", "0-5"]),
      ["0-5"],
    );
    assert.deepEqual(intersectBlocks(["0-5 ", "0-5"], ["0-5 ", "0-5"]), ["0-5"]);
  });

  test("no modifica las listas de entrada", () => {
    const a = ["6-0", "0-23", "0-5"];
    const b = ["0-5", "6-0"];
    intersectBlocks(a, b);
    assert.deepEqual(a, ["6-0", "0-23", "0-5"]);
    assert.deepEqual(b, ["0-5", "6-0"]);
  });
});
