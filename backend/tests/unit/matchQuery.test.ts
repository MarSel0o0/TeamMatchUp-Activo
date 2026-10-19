import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  MATCH_ERRORS,
  parseMatchQuery,
  parseValidInteger,
  readFilterValue,
} from "../../src/domain/matchQuery.ts";
import type { MatchCriteria, QueryResult } from "../../src/domain/matchQuery.ts";

// Spec 005, RF-5, RF-11, RF-12, RF-14, RF-15, RF-16 (filtros), RF-18, RNF-1; plan,
// secciones 2, 3.1, 6 y 8. Sin base de datos ni reloj.

const GAME_ERROR = "juego no válido";
const DISTANCE_ERROR =
  "filtro «Diferencia máxima de rango» no válido: usa un número entero de 0 a 100";
const HOURS_ERROR = "filtro «Horas en común por semana» no válido: usa un número entero de 0 a 168";
const VERIFIED_ERROR = "filtro «Solo cuentas con rango verificado» no válido: usa true o false";
const SEARCH_ERROR = "filtro «Buscar jugador» no válido";
const NO_ACCOUNT_ERROR = "no tienes una cuenta vinculada en este juego";

type Query = Record<string, unknown>;

function failure(error: string): QueryResult {
  return { ok: false, status: 400, error };
}

function success(overrides: Partial<MatchCriteria> = {}): QueryResult {
  return {
    ok: true,
    value: {
      gameId: "lol",
      maxRankDistance: 100,
      minSharedHours: 0,
      onlyVerified: false,
      search: null,
      ...overrides,
    },
  };
}

function parse(extra: Query = {}): QueryResult {
  return parseMatchQuery({ game: "lol", ...extra });
}

describe("MATCH_ERRORS (plan, sección 6)", () => {
  test("contiene los textos exactos de la spec", () => {
    assert.deepStrictEqual(MATCH_ERRORS, {
      game: GAME_ERROR,
      maxRankDistance: DISTANCE_ERROR,
      minSharedHours: HOURS_ERROR,
      onlyVerified: VERIFIED_ERROR,
      search: SEARCH_ERROR,
      noAccount: NO_ACCOUNT_ERROR,
    });
  });

  test("las comillas son « (U+00AB) y » (U+00BB)", () => {
    for (const text of [DISTANCE_ERROR, HOURS_ERROR, VERIFIED_ERROR, SEARCH_ERROR]) {
      assert.ok(text.includes("«"));
      assert.ok(text.includes("»"));
    }
  });

  test("ningún texto nombra a Riot, Ubisoft, Valve ni FACEIT (RNF-3)", () => {
    for (const text of Object.values(MATCH_ERRORS)) {
      assert.doesNotMatch(text, /riot|ubisoft|valve|faceit/i);
    }
  });
});

describe("readFilterValue", () => {
  test("ausente: la clave no está", () => {
    assert.deepStrictEqual(readFilterValue({}, "game"), { kind: "absent" });
  });

  test("ausente: la clave está con undefined", () => {
    assert.deepStrictEqual(readFilterValue({ game: undefined }, "game"), { kind: "absent" });
  });

  test("ausente: no lee propiedades heredadas (constructor, __proto__, toString)", () => {
    for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      assert.deepStrictEqual(readFilterValue({}, name), { kind: "absent" }, name);
    }
  });

  test("vacío: cadena vacía", () => {
    assert.deepStrictEqual(readFilterValue({ game: "" }, "game"), { kind: "empty" });
  });

  test("texto: se conserva sin recortar", () => {
    assert.deepStrictEqual(readFilterValue({ game: " lol " }, "game"), {
      kind: "text",
      text: " lol ",
    });
    assert.deepStrictEqual(readFilterValue({ game: "   " }, "game"), {
      kind: "text",
      text: "   ",
    });
    assert.deepStrictEqual(readFilterValue({ game: "lol" }, "game"), { kind: "text", text: "lol" });
  });

  test("repetido: arreglo de cualquier largo, incluso vacío o de cadenas vacías", () => {
    assert.deepStrictEqual(readFilterValue({ game: ["lol", "cs2"] }, "game"), {
      kind: "repeated",
    });
    assert.deepStrictEqual(readFilterValue({ game: ["", ""] }, "game"), { kind: "repeated" });
    assert.deepStrictEqual(readFilterValue({ game: ["lol"] }, "game"), { kind: "repeated" });
    assert.deepStrictEqual(readFilterValue({ game: [] }, "game"), { kind: "repeated" });
  });

  test("malformed: ni texto ni arreglo", () => {
    const values: readonly unknown[] = [{ a: "b" }, {}, 5, true, false, null, Symbol("x")];
    for (const value of values) {
      assert.deepStrictEqual(readFilterValue({ game: value }, "game"), { kind: "malformed" });
    }
  });

  test("solo lee la clave pedida", () => {
    assert.deepStrictEqual(readFilterValue({ game: "lol", search: "x" }, "search"), {
      kind: "text",
      text: "x",
    });
  });
});

describe("parseValidInteger", () => {
  test("acepta solo dígitos decimales y los lee en base 10", () => {
    assert.strictEqual(parseValidInteger("0"), 0);
    assert.strictEqual(parseValidInteger("5"), 5);
    assert.strictEqual(parseValidInteger("100"), 100);
    assert.strictEqual(parseValidInteger("168"), 168);
    assert.strictEqual(parseValidInteger("007"), 7);
    assert.strictEqual(parseValidInteger("000"), 0);
    assert.strictEqual(parseValidInteger("010"), 10);
  });

  const rejected: readonly string[] = [
    "",
    "abc",
    " 5 ",
    " 5",
    "5 ",
    "+5",
    "-0",
    "-1",
    "2.5",
    "12,5",
    "1e1",
    "1E1",
    "0x10",
    "0b1",
    "0o7",
    "Infinity",
    "NaN",
    "5\n",
    "\n5",
    "5 ",
    "٣", // dígito arábigo-índico: no es 0-9
    "５", // dígito de ancho completo: no es 0-9
    "1_000",
  ];
  for (const text of rejected) {
    test(`rechaza ${JSON.stringify(text)}`, () => {
      assert.strictEqual(parseValidInteger(text), null);
    });
  }

  test("400 dígitos: no es null, pero queda fuera de cualquier rango (Infinity)", () => {
    const result = parseValidInteger("9".repeat(400));
    assert.notStrictEqual(result, null);
    assert.ok(result !== null && !Number.isNaN(result));
    assert.ok(result !== null && result > 168);
  });

  test("400 ceros seguidos de 5: vale 5", () => {
    assert.strictEqual(parseValidInteger(`${"0".repeat(400)}5`), 5);
  });
});

describe("parseMatchQuery: juego (RF-5)", () => {
  test("lol, r6 y cs2 son válidos", () => {
    for (const gameId of ["lol", "r6", "cs2"] as const) {
      assert.deepStrictEqual(parseMatchQuery({ game: gameId }), success({ gameId }));
    }
  });

  const invalidGames: readonly [string, Query][] = [
    ["ausente", {}],
    ["undefined", { game: undefined }],
    ["vacío", { game: "" }],
    ["LOL", { game: "LOL" }],
    ["Cs2", { game: "Cs2" }],
    [" lol ", { game: " lol " }],
    ["lol con espacio final", { game: "lol " }],
    ["repetido distinto", { game: ["lol", "cs2"] }],
    ["repetido igual", { game: ["lol", "lol"] }],
    ["repetido de uno", { game: ["lol"] }],
    ["repetido vacío", { game: ["", ""] }],
    ["constructor", { game: "constructor" }],
    ["__proto__", { game: "__proto__" }],
    ["toString", { game: "toString" }],
    ["hasOwnProperty", { game: "hasOwnProperty" }],
    ["valor desconocido", { game: "dota2" }],
    ["malformed (objeto)", { game: { a: "lol" } }],
    ["malformed (número)", { game: 1 }],
  ];
  for (const [label, query] of invalidGames) {
    test(`${label}: 400 "juego no válido"`, () => {
      assert.deepStrictEqual(parseMatchQuery(query), failure(GAME_ERROR));
    });
  }

  test("una consulta con 'game' heredado (prototipo) no cuenta como juego", () => {
    const query = Object.create({ game: "lol" }) as Query;
    assert.deepStrictEqual(parseMatchQuery(query), failure(GAME_ERROR));
  });
});

describe("parseMatchQuery: distancia máxima (RF-11, RF-12)", () => {
  test("ausente: 100 (RF-11)", () => {
    assert.deepStrictEqual(parse(), success({ maxRankDistance: 100 }));
    assert.deepStrictEqual(parse({ maxRankDistance: undefined }), success({ maxRankDistance: 100 }));
  });

  const valid: readonly [string, number][] = [
    ["0", 0],
    ["1", 1],
    ["25", 25],
    ["99", 99],
    ["100", 100],
    ["007", 7],
    ["000", 0],
    ["0100", 100],
  ];
  for (const [text, expected] of valid) {
    test(`válido ${JSON.stringify(text)} = ${expected}`, () => {
      assert.deepStrictEqual(parse({ maxRankDistance: text }), success({ maxRankDistance: expected }));
    });
  }

  const invalid: readonly [string, unknown][] = [
    ["vacío", ""],
    ["abc", "abc"],
    ["-1", "-1"],
    ["-0", "-0"],
    ["+5", "+5"],
    ["101", "101"],
    ["1000", "1000"],
    ["2.5", "2.5"],
    ["12,5", "12,5"],
    [" 5 ", " 5 "],
    ["1e1", "1e1"],
    ["0x10", "0x10"],
    ["Infinity", "Infinity"],
    ["NaN", "NaN"],
    ["400 dígitos", "9".repeat(400)],
    ["repetido", ["5", "10"]],
    ["repetido de uno", ["5"]],
    ["repetido vacío", ["", ""]],
    ["malformed (objeto)", { a: "5" }],
    ["malformed (número)", 5],
  ];
  for (const [label, value] of invalid) {
    test(`inválido ${label}: 400 de la distancia máxima`, () => {
      assert.deepStrictEqual(parse({ maxRankDistance: value }), failure(DISTANCE_ERROR));
    });
  }
});

describe("parseMatchQuery: mínimo de horas (RF-11, RF-12)", () => {
  test("ausente: 0 (RF-11)", () => {
    assert.deepStrictEqual(parse(), success({ minSharedHours: 0 }));
  });

  const valid: readonly [string, number][] = [
    ["0", 0],
    ["2", 2],
    ["12", 12],
    ["167", 167],
    ["168", 168],
    ["007", 7],
  ];
  for (const [text, expected] of valid) {
    test(`válido ${JSON.stringify(text)} = ${expected}`, () => {
      assert.deepStrictEqual(parse({ minSharedHours: text }), success({ minSharedHours: expected }));
    });
  }

  const invalid: readonly [string, unknown][] = [
    ["vacío", ""],
    ["abc", "abc"],
    ["-1", "-1"],
    ["-0", "-0"],
    ["+5", "+5"],
    ["169", "169"],
    ["12.5", "12.5"],
    ["12,5", "12,5"],
    [" 5 ", " 5 "],
    ["1e1", "1e1"],
    ["0x10", "0x10"],
    ["Infinity", "Infinity"],
    ["400 dígitos", "9".repeat(400)],
    ["repetido", ["1", "2"]],
    ["repetido vacío", ["", ""]],
    ["malformed (objeto)", { a: "5" }],
  ];
  for (const [label, value] of invalid) {
    test(`inválido ${label}: 400 del mínimo de horas`, () => {
      assert.deepStrictEqual(parse({ minSharedHours: value }), failure(HOURS_ERROR));
    });
  }
});

describe("parseMatchQuery: solo verificadas (RF-14)", () => {
  test("ausente: inactivo", () => {
    assert.deepStrictEqual(parse(), success({ onlyVerified: false }));
  });

  test("true activa y false desactiva", () => {
    assert.deepStrictEqual(parse({ onlyVerified: "true" }), success({ onlyVerified: true }));
    assert.deepStrictEqual(parse({ onlyVerified: "false" }), success({ onlyVerified: false }));
  });

  const invalid: readonly [string, unknown][] = [
    ["TRUE", "TRUE"],
    ["False", "False"],
    ["1", "1"],
    ["0", "0"],
    ["abc", "abc"],
    [" true", " true"],
    ["true ", "true "],
    ["vacío", ""],
    ["repetido", ["true", "false"]],
    ["repetido igual", ["true", "true"]],
    ["repetido vacío", ["", ""]],
    ["malformed (objeto)", { a: "true" }],
    ["malformed (booleano)", true],
  ];
  for (const [label, value] of invalid) {
    test(`inválido ${label}: 400 de solo verificadas`, () => {
      assert.deepStrictEqual(parse({ onlyVerified: value }), failure(VERIFIED_ERROR));
    });
  }
});

describe("parseMatchQuery: búsqueda (RF-15)", () => {
  test("ausente, vacía o solo con espacios: no filtra (null)", () => {
    assert.deepStrictEqual(parse(), success({ search: null }));
    assert.deepStrictEqual(parse({ search: undefined }), success({ search: null }));
    assert.deepStrictEqual(parse({ search: "" }), success({ search: null }));
    assert.deepStrictEqual(parse({ search: "   " }), success({ search: null }));
    assert.deepStrictEqual(parse({ search: "\t \n" }), success({ search: null }));
    assert.deepStrictEqual(parse({ search: " " }), success({ search: null }));
  });

  test("con espacios en los extremos: queda recortada", () => {
    assert.deepStrictEqual(parse({ search: "  ana  " }), success({ search: "ana" }));
    assert.deepStrictEqual(parse({ search: "\tana " }), success({ search: "ana" }));
  });

  test("los espacios internos se conservan", () => {
    assert.deepStrictEqual(parse({ search: " a  b " }), success({ search: "a  b" }));
  });

  test("texto literal: los metacaracteres y los acentos se conservan tal cual", () => {
    for (const search of ["a.b", ".*", "(", "[", "ÑANDÚ", "ñandú", "a\\b"]) {
      assert.deepStrictEqual(parse({ search }), success({ search }));
    }
  });

  test("búsqueda larga: no es un error", () => {
    const search = "x".repeat(10_000);
    assert.deepStrictEqual(parse({ search }), success({ search }));
  });

  const invalid: readonly [string, unknown][] = [
    ["repetido distinto", ["a", "b"]],
    ["repetido vacío", ["", ""]],
    ["repetido de uno", ["a"]],
    ["malformed (objeto)", { a: "b" }],
    ["malformed (número)", 5],
  ];
  for (const [label, value] of invalid) {
    test(`inválida ${label}: 400 de búsqueda`, () => {
      assert.deepStrictEqual(parse({ search: value }), failure(SEARCH_ERROR));
    });
  }
});

describe("parseMatchQuery: valores malformed en cada filtro", () => {
  test("un objeto en cada filtro da el error de ese filtro", () => {
    const value = { nested: "x" };
    assert.deepStrictEqual(parseMatchQuery({ game: value }), failure(GAME_ERROR));
    assert.deepStrictEqual(parse({ maxRankDistance: value }), failure(DISTANCE_ERROR));
    assert.deepStrictEqual(parse({ minSharedHours: value }), failure(HOURS_ERROR));
    assert.deepStrictEqual(parse({ onlyVerified: value }), failure(VERIFIED_ERROR));
    assert.deepStrictEqual(parse({ search: value }), failure(SEARCH_ERROR));
  });
});

describe("parseMatchQuery: parámetros desconocidos (RF-18)", () => {
  test("se ignoran", () => {
    assert.deepStrictEqual(
      parse({ page: "2", user: "65a1b2c3d4e5f6a7b8c9d0e1", foo: ["a", "b"], bar: { x: 1 } }),
      success(),
    );
  });

  test("se ignoran aunque tengan nombres de propiedades del prototipo o parecidos a los filtros", () => {
    assert.deepStrictEqual(
      parse({ constructor: "x", MAXRANKDISTANCE: "abc", Search: ["a", "b"], onlyverified: "zzz" }),
      success(),
    );
  });
});

describe("parseMatchQuery: todos los filtros a la vez", () => {
  test("valores válidos de los cinco filtros", () => {
    assert.deepStrictEqual(
      parseMatchQuery({
        game: "cs2",
        maxRankDistance: "30",
        minSharedHours: "168",
        onlyVerified: "true",
        search: " Ñandú ",
        page: "3",
      }),
      success({
        gameId: "cs2",
        maxRankDistance: 30,
        minSharedHours: 168,
        onlyVerified: true,
        search: "Ñandú",
      }),
    );
  });

  test("el resultado no comparte referencia con la consulta", () => {
    const query: Query = { game: "r6", maxRankDistance: "5" };
    const first = parseMatchQuery(query);
    const second = parseMatchQuery(query);
    assert.deepStrictEqual(first, second);
    assert.notStrictEqual(first, second);
  });
});

describe("parseMatchQuery: orden de los errores (RF-16)", () => {
  test("juego + distancia inválidos: gana el juego", () => {
    assert.deepStrictEqual(
      parseMatchQuery({ game: "xx", maxRankDistance: "abc" }),
      failure(GAME_ERROR),
    );
  });

  test("juego ausente + todo lo demás inválido: gana el juego", () => {
    assert.deepStrictEqual(
      parseMatchQuery({
        maxRankDistance: "abc",
        minSharedHours: "abc",
        onlyVerified: "abc",
        search: ["a", "b"],
      }),
      failure(GAME_ERROR),
    );
  });

  test("distancia + horas inválidas: gana la distancia", () => {
    assert.deepStrictEqual(
      parse({ maxRankDistance: "abc", minSharedHours: "abc" }),
      failure(DISTANCE_ERROR),
    );
  });

  test("distancia + horas + verificadas + búsqueda inválidas: gana la distancia", () => {
    assert.deepStrictEqual(
      parse({
        maxRankDistance: "101",
        minSharedHours: "169",
        onlyVerified: "TRUE",
        search: ["a", "b"],
      }),
      failure(DISTANCE_ERROR),
    );
  });

  test("horas + verificadas inválidas: gana el mínimo de horas", () => {
    assert.deepStrictEqual(
      parse({ minSharedHours: "169", onlyVerified: "abc" }),
      failure(HOURS_ERROR),
    );
  });

  test("horas + verificadas + búsqueda inválidas: gana el mínimo de horas", () => {
    assert.deepStrictEqual(
      parse({ minSharedHours: "", onlyVerified: "abc", search: ["a", "b"] }),
      failure(HOURS_ERROR),
    );
  });

  test("verificadas + búsqueda inválidas: gana solo verificadas", () => {
    assert.deepStrictEqual(
      parse({ onlyVerified: "abc", search: ["a", "b"] }),
      failure(VERIFIED_ERROR),
    );
  });

  test("solo búsqueda inválida: error de búsqueda", () => {
    assert.deepStrictEqual(parse({ search: ["a", "b"] }), failure(SEARCH_ERROR));
  });

  test("distancia válida + horas inválidas: error de horas", () => {
    assert.deepStrictEqual(
      parse({ maxRankDistance: "10", minSharedHours: "169" }),
      failure(HOURS_ERROR),
    );
  });

  test("distancia y horas válidas + verificadas inválida: error de verificadas", () => {
    assert.deepStrictEqual(
      parse({ maxRankDistance: "10", minSharedHours: "4", onlyVerified: "1" }),
      failure(VERIFIED_ERROR),
    );
  });

  test("el error siempre trae status 400", () => {
    const result = parseMatchQuery({});
    assert.strictEqual(result.ok, false);
    if (!result.ok) assert.strictEqual(result.status, 400);
  });
});

describe("parseMatchQuery: no muta la consulta", () => {
  test("la consulta queda igual", () => {
    const query: Query = { game: "lol", search: " ana ", maxRankDistance: "007" };
    const copy = structuredClone(query);
    parseMatchQuery(query);
    assert.deepStrictEqual(query, copy);
  });
});
