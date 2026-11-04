import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_ERRORS,
  codePointLength,
  hasForbiddenTitleChar,
  isPlainObject,
  parseGameFilter,
  readJsonInteger,
  trimText,
  validateCreatePayload,
  validateSessionEdit,
} from "../../src/domain/sessionRules.ts";
import type { GameId } from "../../src/domain/games.ts";

// Spec 006, RF-6 (piezas), RF-22, RNF-2, RNF-3; DP6-2, DP6-3, DP6-7, DP6-20, DP6-23, DP6-27,
// DP6-31; plan, secciones 2, 3.1, 3.2, 3.4 y 7. Sin base de datos ni reloj.

const GAME_ERROR = "Juego no válido.";

// Espacio en blanco y fin de línea que recorta DP6-27, uno por uno (código, nombre).
const TRIMMED: ReadonlyArray<readonly [string, string]> = [
  ["\u0009", "U+0009 tabulador"],
  ["\u000B", "U+000B tabulador vertical"],
  ["\u000C", "U+000C avance de página"],
  [" ", "U+0020 espacio"],
  ["\u00A0", "U+00A0 espacio sin separación"],
  ["\uFEFF", "U+FEFF marca de orden de bytes"],
  ["\u1680", "U+1680"],
  ["\u2000", "U+2000"],
  ["\u2001", "U+2001"],
  ["\u2002", "U+2002"],
  ["\u2003", "U+2003"],
  ["\u2004", "U+2004"],
  ["\u2005", "U+2005"],
  ["\u2006", "U+2006"],
  ["\u2007", "U+2007"],
  ["\u2008", "U+2008"],
  ["\u2009", "U+2009"],
  ["\u200A", "U+200A"],
  ["\u202F", "U+202F"],
  ["\u205F", "U+205F"],
  ["\u3000", "U+3000"],
  ["\n", "LF"],
  ["\r", "CR"],
  ["\u2028", "U+2028"],
  ["\u2029", "U+2029"],
];

describe("texto", () => {
  describe("trimText", () => {
    for (const [char, name] of TRIMMED) {
      test(`recorta ${name} en los dos extremos`, () => {
        assert.equal(trimText(`${char}Ranked${char}`), "Ranked");
      });

      test(`recorta ${name} repetido y solo en un extremo`, () => {
        assert.equal(trimText(`${char}${char}${char}Ranked`), "Ranked");
        assert.equal(trimText(`Ranked${char}${char}${char}`), "Ranked");
      });

      test(`no toca ${name} en el interior`, () => {
        assert.equal(trimText(`Ran${char}ked`), `Ran${char}ked`);
      });
    }

    test("recorta una mezcla de caracteres distintos en cada extremo", () => {
      const left = "\u0009\u00A0\uFEFF\n\u3000 ";
      const right = "\u2029\r\u202F\u000B ";
      assert.equal(trimText(`${left}Ranked noche${right}`), "Ranked noche");
    });

    test("el interior queda intacto aunque sea blanco", () => {
      assert.equal(trimText("  a \t b\n\nc\u3000d  "), "a \t b\n\nc\u3000d");
    });

    test("U+0085 no se recorta", () => {
      assert.equal(trimText("\u0085Ranked\u0085"), "\u0085Ranked\u0085");
    });

    test("U+200B no se recorta", () => {
      assert.equal(trimText("\u200BRanked\u200B"), "\u200BRanked\u200B");
    });

    test("U+0085 y U+200B pegados al texto frenan el recorte", () => {
      assert.equal(trimText(" \u0085 Ranked \u200B "), "\u0085 Ranked \u200B");
    });

    test("un texto solo de blancos queda vacío", () => {
      const all = TRIMMED.map(([char]) => char).join("");
      assert.equal(trimText(all), "");
      assert.equal(trimText(""), "");
      assert.equal(trimText("   "), "");
    });

    test("un texto sin blancos en los extremos sale igual", () => {
      assert.equal(trimText("Ranked"), "Ranked");
      assert.equal(trimText("🎮 Ranked 🎮"), "🎮 Ranked 🎮");
    });

    test("<script> sale idéntico (RNF-2)", () => {
      assert.equal(trimText("<script>alert(1)</script>"), "<script>alert(1)</script>");
      assert.equal(trimText("  <script>alert(1)</script>\n"), "<script>alert(1)</script>");
    });

    // RNF-3: tiempo lineal. Una racha larga de blancos en el interior no debe bloquear el bucle de
    // eventos (el parser admite cuerpos de hasta 102 400 bytes).
    describe("rendimiento con rachas largas", () => {
      const RUN = 100_000;
      const LIMIT_MS = 250;
      const RUN_CHARS: ReadonlyArray<readonly [string, string]> = [
        [" ", "espacios"],
        [" ", "U+00A0"],
        ["　", "U+3000"],
        ["\t", "tabuladores"],
        ["\n", "saltos de línea"],
      ];

      function timed(text: string): { result: string; ms: number } {
        const start = performance.now();
        const result = trimText(text);
        return { result, ms: performance.now() - start };
      }

      for (const [char, name] of RUN_CHARS) {
        test(`${name} repetidos en el interior: resultado correcto y rápido`, () => {
          const input = `a${char.repeat(RUN)}a`;
          const { result, ms } = timed(input);
          assert.equal(result, input);
          assert.ok(ms < LIMIT_MS, `tardó ${ms.toFixed(1)} ms`);
        });

        test(`${name} repetidos en los extremos y el interior: resultado correcto y rápido`, () => {
          const inner = `a${char.repeat(RUN)}a`;
          const { result, ms } = timed(`${char.repeat(RUN)}${inner}${char.repeat(RUN)}`);
          assert.equal(result, inner);
          assert.ok(ms < LIMIT_MS, `tardó ${ms.toFixed(1)} ms`);
        });

        test(`${name} repetidos como único contenido: queda vacío y rápido`, () => {
          const { result, ms } = timed(char.repeat(RUN));
          assert.equal(result, "");
          assert.ok(ms < LIMIT_MS, `tardó ${ms.toFixed(1)} ms`);
        });
      }

      test("rachas largas de blancos mezclados dentro de un texto: resultado correcto y rápido", () => {
        const mixed = "  　\t\n".repeat(20_000);
        const input = `${mixed}a${mixed}b${mixed}`;
        const { result, ms } = timed(input);
        assert.equal(result, `a${mixed}b`);
        assert.ok(ms < LIMIT_MS, `tardó ${ms.toFixed(1)} ms`);
      });
    });
  });

  describe("codePointLength", () => {
    test("cuenta puntos de código, no unidades UTF-16", () => {
      assert.equal(codePointLength(""), 0);
      assert.equal(codePointLength("abc"), 3);
      assert.equal(codePointLength("🎮"), 1);
      assert.equal(codePointLength("a🎮b"), 3);
    });

    test("60 emojis cuentan 60 y 61 cuentan 61", () => {
      assert.equal(codePointLength("🎮".repeat(60)), 60);
      assert.equal(codePointLength("🎮".repeat(61)), 61);
      assert.equal("🎮".repeat(60).length, 120);
    });
  });

  describe("hasForbiddenTitleChar", () => {
    const forbidden: ReadonlyArray<readonly [string, string]> = [
      ["\n", "LF"],
      ["\r", "CR"],
      ["\u2028", "U+2028"],
      ["\u2029", "U+2029"],
      ["\u0009", "tabulador"],
      ["\u000B", "U+000B"],
      ["\u000C", "U+000C"],
      ["\u0085", "U+0085"],
      ["\u007F", "U+007F"],
      ["\u0000", "U+0000"],
      ["\u001F", "U+001F"],
      ["\u009F", "U+009F"],
    ];

    for (const [char, name] of forbidden) {
      test(`${name} interno está prohibido`, () => {
        assert.equal(hasForbiddenTitleChar(`Ran${char}ked`), true);
      });
    }

    test("U+00A0 no está prohibido", () => {
      assert.equal(hasForbiddenTitleChar("Ran\u00A0ked"), false);
    });

    test("espacio, U+200B, U+3000 y emojis no están prohibidos", () => {
      assert.equal(hasForbiddenTitleChar("Ran ked"), false);
      assert.equal(hasForbiddenTitleChar("Ran\u200Bked"), false);
      assert.equal(hasForbiddenTitleChar("Ran\u3000ked"), false);
      assert.equal(hasForbiddenTitleChar("🎮 Ranked"), false);
      assert.equal(hasForbiddenTitleChar("<script>alert(1)</script>"), false);
      assert.equal(hasForbiddenTitleChar(""), false);
    });

    test("se comprueba sobre el texto ya recortado: los del extremo no llegan", () => {
      assert.equal(hasForbiddenTitleChar(trimText("Ranked\n")), false);
      assert.equal(hasForbiddenTitleChar(trimText("\r\nRanked")), false);
      assert.equal(hasForbiddenTitleChar(trimText("\tRanked\t")), false);
      assert.equal(hasForbiddenTitleChar(trimText("Ranked\tnoche")), true);
    });
  });
});

describe("enteros", () => {
  test("3 y 3.0 valen 3", () => {
    assert.equal(readJsonInteger(3, 0, 6), 3);
    assert.equal(readJsonInteger(JSON.parse("3.0"), 0, 6), 3);
  });

  test("los extremos del rango son válidos", () => {
    assert.equal(readJsonInteger(0, 0, 6), 0);
    assert.equal(readJsonInteger(6, 0, 6), 6);
    assert.equal(readJsonInteger(2, 2, 6), 2);
    assert.equal(readJsonInteger(23, 0, 23), 23);
  });

  test("justo fuera del rango es null", () => {
    assert.equal(readJsonInteger(-1, 0, 6), null);
    assert.equal(readJsonInteger(7, 0, 6), null);
    assert.equal(readJsonInteger(1, 2, 6), null);
    assert.equal(readJsonInteger(24, 0, 23), null);
    assert.equal(readJsonInteger(5, 1, 4), null);
    assert.equal(readJsonInteger(0, 1, 4), null);
  });

  test("texto numérico no es entero JSON", () => {
    assert.equal(readJsonInteger("3", 0, 6), null);
    assert.equal(readJsonInteger("", 0, 6), null);
    assert.equal(readJsonInteger(" 3 ", 0, 6), null);
  });

  test("decimales no son enteros", () => {
    assert.equal(readJsonInteger(3.5, 0, 6), null);
    assert.equal(readJsonInteger(0.1, 0, 6), null);
    assert.equal(readJsonInteger(5.999, 0, 6), null);
  });

  test("booleanos, nulo, undefined, objetos y arreglos no son enteros", () => {
    assert.equal(readJsonInteger(true, 0, 6), null);
    assert.equal(readJsonInteger(false, 0, 6), null);
    assert.equal(readJsonInteger(null, 0, 6), null);
    assert.equal(readJsonInteger(undefined, 0, 6), null);
    assert.equal(readJsonInteger({}, 0, 6), null);
    assert.equal(readJsonInteger([3], 0, 6), null);
    assert.equal(readJsonInteger(3n, 0, 6), null);
  });

  test("NaN e Infinity no son enteros", () => {
    assert.equal(readJsonInteger(Number.NaN, 0, 6), null);
    assert.equal(readJsonInteger(Number.POSITIVE_INFINITY, 0, 6), null);
    assert.equal(readJsonInteger(Number.NEGATIVE_INFINITY, 0, 6), null);
  });

  test("-0 se normaliza a 0", () => {
    const result = readJsonInteger(-0, 0, 6);
    assert.equal(result, 0);
    assert.ok(Object.is(result, 0), "el resultado debe ser +0, no -0");
  });

  test("-0 fuera de un rango que no incluye 0 es null", () => {
    assert.equal(readJsonInteger(-0, 1, 4), null);
  });
});

describe("objeto", () => {
  test("un objeto literal y uno vacío son objetos planos", () => {
    assert.equal(isPlainObject({}), true);
    assert.equal(isPlainObject({ a: 1 }), true);
    assert.equal(isPlainObject(JSON.parse('{"title":"x"}')), true);
  });

  test("arreglos, nulo, números, texto y booleanos no lo son", () => {
    assert.equal(isPlainObject([]), false);
    assert.equal(isPlainObject([{}]), false);
    assert.equal(isPlainObject(null), false);
    assert.equal(isPlainObject(3), false);
    assert.equal(isPlainObject("x"), false);
    assert.equal(isPlainObject(true), false);
    assert.equal(isPlainObject(undefined), false);
  });
});

describe("filtro", () => {
  const gameError = { ok: false, status: 400, error: GAME_ERROR };

  test("ausente: todos (null)", () => {
    assert.deepEqual(parseGameFilter({}), { ok: true, value: null });
  });

  test("presente pero undefined: todos (null)", () => {
    assert.deepEqual(parseGameFilter({ game: undefined }), { ok: true, value: null });
  });

  test("all: todos (null)", () => {
    assert.deepEqual(parseGameFilter({ game: "all" }), { ok: true, value: null });
  });

  for (const game of ["lol", "r6", "cs2"] as const) {
    test(`${game}: ese juego`, () => {
      assert.deepEqual(parseGameFilter({ game }), { ok: true, value: game });
    });
  }

  test("vacío: 400", () => {
    assert.deepEqual(parseGameFilter({ game: "" }), gameError);
  });

  test("repetido: 400", () => {
    assert.deepEqual(parseGameFilter({ game: ["lol", "cs2"] }), gameError);
    assert.deepEqual(parseGameFilter({ game: ["lol"] }), gameError);
    assert.deepEqual(parseGameFilter({ game: [] }), gameError);
  });

  test("mayúsculas: 400", () => {
    assert.deepEqual(parseGameFilter({ game: "ALL" }), gameError);
    assert.deepEqual(parseGameFilter({ game: "LOL" }), gameError);
    assert.deepEqual(parseGameFilter({ game: "Lol" }), gameError);
  });

  test("con espacios: 400", () => {
    assert.deepEqual(parseGameFilter({ game: " lol " }), gameError);
    assert.deepEqual(parseGameFilter({ game: "lol " }), gameError);
    assert.deepEqual(parseGameFilter({ game: " all" }), gameError);
  });

  test("valor desconocido: 400", () => {
    assert.deepEqual(parseGameFilter({ game: "xyz" }), gameError);
  });

  test("__proto__, constructor y toString no pasan", () => {
    assert.deepEqual(parseGameFilter({ game: "__proto__" }), gameError);
    assert.deepEqual(parseGameFilter({ game: "constructor" }), gameError);
    assert.deepEqual(parseGameFilter({ game: "toString" }), gameError);
    assert.deepEqual(parseGameFilter({ game: "hasOwnProperty" }), gameError);
  });

  test("una consulta con clave heredada no cuenta como presente", () => {
    const inherited: Record<string, unknown> = Object.create({ game: "xyz" });
    assert.deepEqual(parseGameFilter(inherited), { ok: true, value: null });
  });

  test("valores que no son texto: 400", () => {
    assert.deepEqual(parseGameFilter({ game: { a: "lol" } }), gameError);
    assert.deepEqual(parseGameFilter({ game: 3 }), gameError);
    assert.deepEqual(parseGameFilter({ game: null }), gameError);
    assert.deepEqual(parseGameFilter({ game: true }), gameError);
  });

  test("parámetros desconocidos se ignoran", () => {
    assert.deepEqual(parseGameFilter({ page: "2" }), { ok: true, value: null });
    assert.deepEqual(parseGameFilter({ page: "2", game: "r6", foo: ["a", "b"] }), {
      ok: true,
      value: "r6",
    });
    assert.deepEqual(parseGameFilter({ page: ["x", "y"], game: "xyz" }), gameError);
  });
});

describe("SESSION_ERRORS", () => {
  test("textos exactos del plan, sección 7", () => {
    assert.deepEqual(SESSION_ERRORS, {
      game: "Juego no válido.",
      noAccount: "No tienes una cuenta vinculada en este juego.",
      title: "El título debe tener entre 3 y 60 caracteres.",
      notes: "Las notas deben ser texto de hasta 160 caracteres.",
      day: "Día no válido: usa un entero de 0 (lunes) a 6 (domingo).",
      startHour: "Hora de inicio no válida: usa un entero de 0 a 23.",
      durationHours: "Duración no válida: usa un entero de 1 a 4 horas.",
      slots: "Cupos no válidos: usa un entero de 2 a 6.",
      slotsBelowParticipants: "No puedes dejar menos cupos que jugadores inscritos.",
      notFound: "Sesión no encontrada.",
      notHostEdit: "Solo quien organiza puede editar la sesión.",
      notHostCancel: "Solo quien organiza puede cancelar la sesión.",
      alreadyJoined: "Ya estás inscrito en esta sesión.",
      full: "Esta sesión ya no admite jugadores.",
      hostLeave: "Eres quien organiza: cancela la sesión en lugar de salir.",
      notJoined: "No estás inscrito en esta sesión.",
      badId: "id con formato inválido",
      badJson: "JSON mal formado",
    });
  });
});

// Spec 006, RF-6, RF-7, RF-15, RF-26, RF-27; DP6-1, DP6-9, DP6-19, DP6-22, DP6-29; plan, 3.3 y 7.

const E = SESSION_ERRORS;
const LINKED: ReadonlySet<GameId> = new Set<GameId>(["lol", "cs2"]);
const NONE: ReadonlySet<GameId> = new Set<GameId>();

function fail(error: string) {
  return { ok: false, status: 400, error };
}

function valid(): Record<string, unknown> {
  return {
    gameId: "lol",
    title: "Ranked noche",
    notes: "Traigan micro",
    day: 2,
    startHour: 21,
    durationHours: 2,
    slots: 5,
  };
}

function withField(field: string, value: unknown): Record<string, unknown> {
  return { ...valid(), [field]: value };
}

function without(field: string): Record<string, unknown> {
  const body = valid();
  delete body[field];
  return body;
}

describe("crear", () => {
  const create = (body: unknown, linked: ReadonlySet<GameId> = LINKED) =>
    validateCreatePayload(body, linked);

  describe("cuerpo válido", () => {
    test("devuelve los siete campos", () => {
      assert.deepEqual(create(valid()), {
        ok: true,
        value: {
          gameId: "lol",
          title: "Ranked noche",
          notes: "Traigan micro",
          day: 2,
          startHour: 21,
          durationHours: 2,
          slots: 5,
        },
      });
    });

    test("extremos de los rangos son válidos", () => {
      const low = { ...valid(), day: 0, startHour: 0, durationHours: 1, slots: 2 };
      const high = { ...valid(), day: 6, startHour: 23, durationHours: 4, slots: 6 };
      assert.deepEqual(create(low), { ok: true, value: { ...low, notes: "Traigan micro" } });
      assert.deepEqual(create(high), { ok: true, value: { ...high, notes: "Traigan micro" } });
    });

    test("cada juego vinculado vale", () => {
      const result = create(withField("gameId", "cs2"));
      assert.deepEqual(result.ok && result.value.gameId, "cs2");
    });

    test("3.0 llega como 3 y vale", () => {
      const body = JSON.stringify({ ...valid(), day: 3.0 }).replace('"day":3', '"day":3.0');
      const result = create(JSON.parse(body));
      assert.equal(result.ok && result.value.day, 3);
    });

    test("el título y las notas salen recortados", () => {
      const result = create({ ...valid(), title: "  Ranked  ", notes: "\u3000hola\n" });
      assert.equal(result.ok && result.value.title, "Ranked");
      assert.equal(result.ok && result.value.notes, "hola");
    });
  });

  describe("campos extra (RF-15)", () => {
    test("no aparecen en el resultado", () => {
      const body = {
        ...valid(),
        hostId: "otro",
        participants: ["a"],
        participantIds: ["a"],
        status: "full",
        id: "123",
        createdAt: "2020-01-01",
        foo: { bar: 1 },
      };
      const result = create(body);
      assert.equal(result.ok, true);
      assert.deepEqual(Object.keys(result.ok ? result.value : {}).sort(), [
        "day",
        "durationHours",
        "gameId",
        "notes",
        "slots",
        "startHour",
        "title",
      ]);
    });

    test("campos extra inválidos no producen error", () => {
      assert.equal(create({ ...valid(), hostId: null, status: 5 }).ok, true);
    });
  });

  describe("sin cuerpo (DP6-29)", () => {
    test("undefined equivale a {}: Juego no válido.", () => {
      assert.deepEqual(create(undefined), fail(E.game));
      assert.deepEqual(create({}), fail(E.game));
    });

    test("undefined y {} dan lo mismo", () => {
      assert.deepEqual(create(undefined), create({}));
      assert.deepEqual(create(undefined, NONE), create({}, NONE));
    });

    test("un valor que no es objeto se trata como {}", () => {
      assert.deepEqual(create(null), fail(E.game));
      assert.deepEqual(create([]), fail(E.game));
      assert.deepEqual(create("x"), fail(E.game));
      assert.deepEqual(create(3), fail(E.game));
    });
  });

  describe("juego", () => {
    const bad: ReadonlyArray<readonly [string, unknown]> = [
      ["nulo", null],
      ["número", 3],
      ["booleano", true],
      ["objeto", { a: "lol" }],
      ["arreglo", ["lol"]],
      ["vacío", ""],
      ["mayúsculas", "LOL"],
      ["con espacios", " lol "],
      ["desconocido", "xyz"],
      ["__proto__", "__proto__"],
      ["constructor", "constructor"],
      ["toString", "toString"],
      ["all", "all"],
    ];

    test("ausente", () => {
      assert.deepEqual(create(without("gameId")), fail(E.game));
    });

    for (const [name, value] of bad) {
      test(`${name}: Juego no válido.`, () => {
        assert.deepEqual(create(withField("gameId", value)), fail(E.game));
      });
    }

    test("juego inválido sin cuenta vinculada: juego antes que cuenta", () => {
      assert.deepEqual(create(withField("gameId", "xyz"), NONE), fail(E.game));
    });

    test("juego inválido y todo lo demás inválido: juego", () => {
      assert.deepEqual(
        create({ gameId: "xyz", title: "", notes: 5, day: "a", startHour: "b", slots: 99 }),
        fail(E.game),
      );
    });
  });

  describe("cuenta vinculada (RF-27)", () => {
    test("juego válido sin cuenta en ese juego", () => {
      assert.deepEqual(create(withField("gameId", "r6")), fail(E.noAccount));
      assert.deepEqual(create(valid(), NONE), fail(E.noAccount));
    });

    test("cuenta y título inválido: título no se mira, gana la cuenta", () => {
      assert.deepEqual(create(withField("title", ""), NONE), fail(E.noAccount));
    });

    test("con cuenta y título inválido: título", () => {
      assert.deepEqual(create(withField("title", "")), fail(E.title));
    });

    test("cuenta vinculada en otro juego no sirve", () => {
      assert.deepEqual(create(withField("gameId", "r6"), LINKED), fail(E.noAccount));
    });
  });

  describe("título", () => {
    test("ausente", () => {
      assert.deepEqual(create(without("title")), fail(E.title));
    });

    const bad: ReadonlyArray<readonly [string, unknown]> = [
      ["nulo", null],
      ["número", 12345],
      ["booleano", true],
      ["objeto", {}],
      ["arreglo", ["abc"]],
      ["vacío", ""],
      ["solo espacios", "     "],
      ['"  ab  " (2 tras recortar)', "  ab  "],
      ["2 caracteres", "ab"],
      ["61 caracteres", "a".repeat(61)],
      ["61 emojis", "\u{1F3AE}".repeat(61)],
      ["salto de línea interno", "Ran\nked"],
      ["retorno de carro interno", "Ran\rked"],
      ["tabulador interno", "Ranked\tnoche"],
      ["U+2028 interno", "Ran\u2028ked"],
      ["U+2029 interno", "Ran\u2029ked"],
      ["U+0000 interno", "Ran\u0000ked"],
      ["U+007F interno", "Ran\u007Fked"],
      ["U+0085 interno", "Ran\u0085ked"],
      ["U+009F interno", "Ran\u009Fked"],
      ["salto de línea interno tras recortar", "\n Ran\nked \n"],
    ];

    for (const [name, value] of bad) {
      test(`${name}: título`, () => {
        assert.deepEqual(create(withField("title", value)), fail(E.title));
      });
    }

    test('"Ranked\\n" es válido y queda "Ranked"', () => {
      const result = create(withField("title", "Ranked\n"));
      assert.equal(result.ok && result.value.title, "Ranked");
    });

    test('"\\tRanked\\t" es válido y queda "Ranked"', () => {
      const result = create(withField("title", "\tRanked\t"));
      assert.equal(result.ok && result.value.title, "Ranked");
    });

    test("U+200B al inicio no se recorta y cuenta como carácter", () => {
      const result = create(withField("title", "\u200BRanked"));
      assert.equal(result.ok && result.value.title, "\u200BRanked");
    });

    test("U+200B solo con dos letras: 3 caracteres, válido", () => {
      const result = create(withField("title", "\u200Bab"));
      assert.equal(result.ok && result.value.title, "\u200Bab");
    });

    test("3 y 60 caracteres son válidos", () => {
      assert.equal(create(withField("title", "abc")).ok, true);
      assert.equal(create(withField("title", "a".repeat(60))).ok, true);
    });

    test("60 emojis son válidos (puntos de código)", () => {
      assert.equal(create(withField("title", "\u{1F3AE}".repeat(60))).ok, true);
    });

    test("<script> se conserva tal cual (RNF-2)", () => {
      const result = create(withField("title", "<script>alert(1)</script>"));
      assert.equal(result.ok && result.value.title, "<script>alert(1)</script>");
    });

    test("U+00A0 interno es válido", () => {
      assert.equal(create(withField("title", "Ran ked")).ok, true);
    });

    test("título inválido y notas inválidas: título", () => {
      assert.deepEqual(create({ ...valid(), title: "ab", notes: 5 }), fail(E.title));
    });
  });

  describe("notas", () => {
    test("ausentes: texto vacío", () => {
      const result = create(without("notes"));
      assert.deepEqual(result.ok && result.value.notes, "");
    });

    test('"" y solo espacios: texto vacío', () => {
      const a = create(withField("notes", ""));
      const b = create(withField("notes", "   "));
      assert.equal(a.ok && a.value.notes, "");
      assert.equal(b.ok && b.value.notes, "");
    });

    test("solo U+3000: texto vacío", () => {
      const result = create(withField("notes", "\u3000\u3000\u3000"));
      assert.equal(result.ok && result.value.notes, "");
    });

    test("nulas: notas", () => {
      assert.deepEqual(create(withField("notes", null)), fail(E.notes));
    });

    test("5, booleano, objeto y arreglo: notas", () => {
      assert.deepEqual(create(withField("notes", 5)), fail(E.notes));
      assert.deepEqual(create(withField("notes", true)), fail(E.notes));
      assert.deepEqual(create(withField("notes", {})), fail(E.notes));
      assert.deepEqual(create(withField("notes", ["a"])), fail(E.notes));
    });

    test("161 caracteres: notas", () => {
      assert.deepEqual(create(withField("notes", "a".repeat(161))), fail(E.notes));
    });

    test("160 caracteres es válido", () => {
      const result = create(withField("notes", "a".repeat(160)));
      assert.equal(result.ok && result.value.notes, "a".repeat(160));
    });

    test("160 emojis es válido y 161 no", () => {
      assert.equal(create(withField("notes", "\u{1F3AE}".repeat(160))).ok, true);
      assert.deepEqual(create(withField("notes", "\u{1F3AE}".repeat(161))), fail(E.notes));
    });

    test("161 con espacios en los extremos que recortan a 160 es válido", () => {
      const result = create(withField("notes", " " + "a".repeat(160)));
      assert.equal(result.ok && result.value.notes, "a".repeat(160));
    });

    test("saltos de línea y controles internos son válidos (DP6-31)", () => {
      const text = "linea 1\nlinea 2\tcon tab\u0000";
      const result = create(withField("notes", text));
      assert.equal(result.ok && result.value.notes, text);
    });

    test("notas inválidas y día inválido: notas", () => {
      assert.deepEqual(create({ ...valid(), notes: 5, day: 9 }), fail(E.notes));
    });
  });

  describe("día, hora, duración y cupos", () => {
    const cases: ReadonlyArray<readonly [string, string, readonly [number, number]]> = [
      ["day", E.day, [0, 6]],
      ["startHour", E.startHour, [0, 23]],
      ["durationHours", E.durationHours, [1, 4]],
      ["slots", E.slots, [2, 6]],
    ];

    for (const [field, error, [min, max]] of cases) {
      describe(field, () => {
        test("ausente", () => {
          assert.deepEqual(create(without(field)), fail(error));
        });

        test("justo fuera del rango", () => {
          assert.deepEqual(create(withField(field, min - 1)), fail(error));
          assert.deepEqual(create(withField(field, max + 1)), fail(error));
        });

        test("extremos válidos", () => {
          const low = create(withField(field, min));
          const high = create(withField(field, max));
          assert.equal(low.ok, true);
          assert.equal(high.ok, true);
        });

        test("texto, decimal, booleano, nulo, objeto y arreglo", () => {
          assert.deepEqual(create(withField(field, String(min))), fail(error));
          assert.deepEqual(create(withField(field, min + 0.5)), fail(error));
          assert.deepEqual(create(withField(field, true)), fail(error));
          assert.deepEqual(create(withField(field, null)), fail(error));
          assert.deepEqual(create(withField(field, {})), fail(error));
          assert.deepEqual(create(withField(field, [min])), fail(error));
        });

        test("NaN e Infinity", () => {
          assert.deepEqual(create(withField(field, Number.NaN)), fail(error));
          assert.deepEqual(create(withField(field, Number.POSITIVE_INFINITY)), fail(error));
        });
      });
    }

    test('día "3" (texto): día', () => {
      assert.deepEqual(create(withField("day", "3")), fail(E.day));
    });

    test("-0 en el día se normaliza a 0", () => {
      const result = create(withField("day", -0));
      assert.ok(result.ok && Object.is(result.value.day, 0));
    });
  });

  describe("orden: un caso por salto", () => {
    test("juego antes que cuenta", () => {
      assert.deepEqual(create({ gameId: "xyz" }, NONE), fail(E.game));
    });

    test("cuenta antes que título", () => {
      assert.deepEqual(create({ gameId: "r6", title: "" }), fail(E.noAccount));
    });

    test("título antes que notas", () => {
      assert.deepEqual(create({ gameId: "lol", title: "", notes: 5 }), fail(E.title));
    });

    test("notas antes que día", () => {
      assert.deepEqual(create({ gameId: "lol", title: "abc", notes: 5, day: 9 }), fail(E.notes));
    });

    test("día antes que hora", () => {
      assert.deepEqual(
        create({ gameId: "lol", title: "abc", day: 9, startHour: 99 }),
        fail(E.day),
      );
    });

    test("hora antes que duración", () => {
      assert.deepEqual(
        create({ gameId: "lol", title: "abc", day: 1, startHour: 99, durationHours: 99 }),
        fail(E.startHour),
      );
    });

    test("duración antes que cupos", () => {
      assert.deepEqual(
        create({ gameId: "lol", title: "abc", day: 1, startHour: 1, durationHours: 99, slots: 99 }),
        fail(E.durationHours),
      );
    });

    test("cupos al final", () => {
      assert.deepEqual(
        create({ gameId: "lol", title: "abc", day: 1, startHour: 1, durationHours: 1, slots: 99 }),
        fail(E.slots),
      );
    });

    test("solo gameId y título válidos: día", () => {
      assert.deepEqual(create({ gameId: "lol", title: "abc" }), fail(E.day));
    });
  });

  test("no modifica el cuerpo ni el conjunto de cuentas", () => {
    const body = { ...valid(), title: "  Ranked  " };
    const snapshot = JSON.stringify(body);
    create(body);
    assert.equal(JSON.stringify(body), snapshot);
    assert.deepEqual([...LINKED], ["lol", "cs2"]);
  });
});

describe("editar", () => {
  const edit = (body: unknown) => validateSessionEdit(body);

  describe("sin cambios (RF-26, DP6-29)", () => {
    test("{} da un parche vacío", () => {
      assert.deepEqual(edit({}), { ok: true, value: {} });
    });

    test("undefined equivale a {}", () => {
      assert.deepEqual(edit(undefined), { ok: true, value: {} });
    });

    test("un valor que no es objeto se trata como {}", () => {
      assert.deepEqual(edit(null), { ok: true, value: {} });
      assert.deepEqual(edit([]), { ok: true, value: {} });
      assert.deepEqual(edit("x"), { ok: true, value: {} });
    });

    test("solo campos ignorados da un parche vacío", () => {
      const body = { hostId: "x", participants: [], status: "full", id: "1", createdAt: "z" };
      assert.deepEqual(edit(body), { ok: true, value: {} });
    });
  });

  describe("parcial", () => {
    test("solo slots", () => {
      assert.deepEqual(edit({ slots: 4 }), { ok: true, value: { slots: 4 } });
    });

    test("solo los enviados aparecen", () => {
      assert.deepEqual(edit({ day: 0, title: "  Nuevo  " }), {
        ok: true,
        value: { title: "Nuevo", day: 0 },
      });
    });

    test("los seis campos editables", () => {
      assert.deepEqual(
        edit({
          title: "Otro título",
          notes: " nota ",
          day: 6,
          startHour: 0,
          durationHours: 4,
          slots: 2,
        }),
        {
          ok: true,
          value: {
            title: "Otro título",
            notes: "nota",
            day: 6,
            startHour: 0,
            durationHours: 4,
            slots: 2,
          },
        },
      );
    });

    test("campos extra no aparecen en el parche", () => {
      const result = edit({ ...valid(), hostId: "x", status: "full", id: "1", createdAt: "z" });
      assert.deepEqual(Object.keys(result.ok ? result.value : {}).sort(), [
        "day",
        "durationHours",
        "notes",
        "slots",
        "startHour",
        "title",
      ]);
    });
  });

  describe("juego (RF-15, DP6-19)", () => {
    test("gameId inexistente se ignora", () => {
      assert.deepEqual(edit({ gameId: "xyz" }), { ok: true, value: {} });
    });

    test("gameId nulo, número o válido se ignora y no aparece", () => {
      assert.deepEqual(edit({ gameId: null, slots: 3 }), { ok: true, value: { slots: 3 } });
      assert.deepEqual(edit({ gameId: 7, slots: 3 }), { ok: true, value: { slots: 3 } });
      assert.deepEqual(edit({ gameId: "cs2", slots: 3 }), { ok: true, value: { slots: 3 } });
    });

    test("nunca lee gameId: un getter que lanza no se invoca", () => {
      const body = {
        slots: 3,
        get gameId(): never {
          throw new Error("gameId leído");
        },
      };
      assert.deepEqual(edit(body), { ok: true, value: { slots: 3 } });
    });
  });

  describe("título", () => {
    test("null: título", () => {
      assert.deepEqual(edit({ title: null }), fail(E.title));
    });

    test('"": título', () => {
      assert.deepEqual(edit({ title: "" }), fail(E.title));
    });

    test("solo espacios: título", () => {
      assert.deepEqual(edit({ title: "   " }), fail(E.title));
    });

    test("2 y 61 caracteres: título", () => {
      assert.deepEqual(edit({ title: "ab" }), fail(E.title));
      assert.deepEqual(edit({ title: "a".repeat(61) }), fail(E.title));
    });

    test("tipo incorrecto: título", () => {
      assert.deepEqual(edit({ title: 5 }), fail(E.title));
      assert.deepEqual(edit({ title: ["abc"] }), fail(E.title));
    });

    test("carácter prohibido interno: título; en el extremo se recorta", () => {
      assert.deepEqual(edit({ title: "Ranked\tnoche" }), fail(E.title));
      assert.deepEqual(edit({ title: "Ranked\n" }), { ok: true, value: { title: "Ranked" } });
      assert.deepEqual(edit({ title: "\tRanked\t" }), { ok: true, value: { title: "Ranked" } });
    });

    test("U+200B no se recorta", () => {
      assert.deepEqual(edit({ title: "\u200BRanked" }), {
        ok: true,
        value: { title: "\u200BRanked" },
      });
    });
  });

  describe("notas (DP6-22)", () => {
    test('"" es válida y queda ""', () => {
      assert.deepEqual(edit({ notes: "" }), { ok: true, value: { notes: "" } });
    });

    test('"   " es válida y queda ""', () => {
      assert.deepEqual(edit({ notes: "   " }), { ok: true, value: { notes: "" } });
    });

    test("solo U+3000 es válida y queda vacía", () => {
      assert.deepEqual(edit({ notes: "\u3000" }), { ok: true, value: { notes: "" } });
    });

    test("null: notas", () => {
      assert.deepEqual(edit({ notes: null }), fail(E.notes));
    });

    test("tipo incorrecto: notas", () => {
      assert.deepEqual(edit({ notes: 5 }), fail(E.notes));
      assert.deepEqual(edit({ notes: false }), fail(E.notes));
      assert.deepEqual(edit({ notes: [] }), fail(E.notes));
    });

    test("160 emojis válido, 161 no", () => {
      assert.equal(edit({ notes: "\u{1F3AE}".repeat(160) }).ok, true);
      assert.deepEqual(edit({ notes: "\u{1F3AE}".repeat(161) }), fail(E.notes));
    });

    test("saltos de línea internos son válidos", () => {
      assert.deepEqual(edit({ notes: "a\nb" }), { ok: true, value: { notes: "a\nb" } });
    });
  });

  describe("día, hora, duración y cupos", () => {
    const cases: ReadonlyArray<readonly [string, string, readonly [number, number]]> = [
      ["day", E.day, [0, 6]],
      ["startHour", E.startHour, [0, 23]],
      ["durationHours", E.durationHours, [1, 4]],
      ["slots", E.slots, [2, 6]],
    ];

    for (const [field, error, [min, max]] of cases) {
      describe(field, () => {
        test("extremos válidos", () => {
          assert.deepEqual(edit({ [field]: min }), { ok: true, value: { [field]: min } });
          assert.deepEqual(edit({ [field]: max }), { ok: true, value: { [field]: max } });
        });

        test("fuera de rango", () => {
          assert.deepEqual(edit({ [field]: min - 1 }), fail(error));
          assert.deepEqual(edit({ [field]: max + 1 }), fail(error));
        });

        test("nulo, texto, decimal, booleano, objeto y arreglo", () => {
          assert.deepEqual(edit({ [field]: null }), fail(error));
          assert.deepEqual(edit({ [field]: String(min) }), fail(error));
          assert.deepEqual(edit({ [field]: min + 0.5 }), fail(error));
          assert.deepEqual(edit({ [field]: true }), fail(error));
          assert.deepEqual(edit({ [field]: {} }), fail(error));
          assert.deepEqual(edit({ [field]: [min] }), fail(error));
        });
      });
    }

    test('day "3": día', () => {
      assert.deepEqual(edit({ day: "3" }), fail(E.day));
    });

    test("-0 se normaliza a 0", () => {
      const result = edit({ day: -0 });
      assert.ok(result.ok && Object.is(result.value.day, 0));
    });
  });

  describe("orden: título → notas → día → hora → duración → cupos", () => {
    test("título antes que notas", () => {
      assert.deepEqual(edit({ notes: 5, title: null }), fail(E.title));
    });

    test("notas antes que día", () => {
      assert.deepEqual(edit({ day: 9, notes: null }), fail(E.notes));
    });

    test("día antes que hora", () => {
      assert.deepEqual(edit({ startHour: 99, day: 9 }), fail(E.day));
    });

    test("hora antes que duración", () => {
      assert.deepEqual(edit({ durationHours: 99, startHour: 99 }), fail(E.startHour));
    });

    test("duración antes que cupos", () => {
      assert.deepEqual(edit({ slots: 99, durationHours: 99 }), fail(E.durationHours));
    });

    test("un campo válido no tapa un error posterior", () => {
      assert.deepEqual(edit({ title: "abc", slots: 99 }), fail(E.slots));
    });

    test("los campos ausentes no se validan", () => {
      assert.deepEqual(edit({ day: 1 }), { ok: true, value: { day: 1 } });
    });
  });

  test("no modifica el cuerpo", () => {
    const body = { title: "  Ranked  ", notes: "  " };
    const snapshot = JSON.stringify(body);
    edit(body);
    assert.equal(JSON.stringify(body), snapshot);
  });
});
