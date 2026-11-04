import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCOUNT_ERRORS,
  isValidId,
  normalizeRegion,
  parseAccountFilters,
  validateAccountEdit,
  validateLinkPayload,
} from "../../src/domain/accountRules.ts";
import type { GameId } from "../../src/domain/games.ts";

// Spec 004, RF-2, RF-6, RF-7, RF-13 (formato), RF-22, RF-38, RF-40, DP-6, DP-10, DP-19,
// DP-23, DP-35; plan, secciones 2 y 7.

const GAME_ERROR = "juego no válido";
const ID_ERROR = "id con formato inválido";
const HANDLE_ERRORS: Record<GameId, string> = {
  lol: "Riot ID no válido: usa el formato Nombre#TAG, con 3 a 16 caracteres antes de # y 2 a 5 letras o dígitos después",
  r6: "Ubisoft ID no válido: usa de 3 a 20 letras, dígitos, punto, guion o guion bajo",
  cs2: "SteamID64 no válido: son 17 dígitos que empiezan por 7656119",
};
const REGION_ERRORS: Record<GameId, string> = {
  lol: "región no válida para League of Legends",
  r6: "región no válida para Rainbow Six Siege",
  cs2: "región no válida para Counter-Strike 2",
};
const EDIT_HANDLE_ERROR =
  "el identificador del juego no se puede editar: desvincula la cuenta y vuelve a vincularla";

const VALID: Record<GameId, { handle: string; region: string }> = {
  lol: { handle: "Jugador#LAS", region: "LAS" },
  r6: { handle: "tu.nombre-ubi_1", region: "LATAM" },
  cs2: { handle: "76561190000000001", region: "South America" },
};

const SESSION_ID = "65a1b2c3d4e5f6a7b8c9d0e1";
const OTHER_ID = "65A1B2C3D4E5F6A7B8C9D0FF";

const INVALID_VALUES: readonly [string, unknown][] = [
  ["nulo", null],
  ["vacío", ""],
  ["solo espacios", "   "],
  ["número", 42],
  ["objeto", { value: "x" }],
  ["arreglo", ["x"]],
  ["booleano", true],
];

function fail(error: string) {
  return { ok: false, status: 400, error };
}

describe("ACCOUNT_ERRORS (plan, sección 7.2; spec, DP-6)", () => {
  // Textos como literales de la spec, no importados del código (plan, P-23).
  test("textos exactos, en minúscula inicial y sin punto final", () => {
    assert.deepEqual(
      {
        invalidId: ACCOUNT_ERRORS.invalidId,
        invalidGame: ACCOUNT_ERRORS.invalidGame,
        invalidHandle: ACCOUNT_ERRORS.invalidHandle,
        invalidRegion: {
          lol: ACCOUNT_ERRORS.invalidRegion("lol"),
          r6: ACCOUNT_ERRORS.invalidRegion("r6"),
          cs2: ACCOUNT_ERRORS.invalidRegion("cs2"),
        },
        duplicate: ACCOUNT_ERRORS.duplicate,
        handleNotEditable: ACCOUNT_ERRORS.handleNotEditable,
        accountNotFound: ACCOUNT_ERRORS.accountNotFound,
        noAccountForGame: ACCOUNT_ERRORS.noAccountForGame,
      },
      {
        invalidId: ID_ERROR,
        invalidGame: GAME_ERROR,
        invalidHandle: HANDLE_ERRORS,
        invalidRegion: REGION_ERRORS,
        duplicate: "ya tienes una cuenta vinculada en este juego",
        handleNotEditable: EDIT_HANDLE_ERROR,
        accountNotFound: "cuenta no encontrada",
        noAccountForGame: "el jugador no tiene una cuenta vinculada en este juego",
      },
    );
  });

  test("solo tiene los textos propios: el 403 y el 404 de usuario viven en utils y services (P-23)", () => {
    assert.deepEqual(Object.keys(ACCOUNT_ERRORS).sort(), [
      "accountNotFound",
      "duplicate",
      "handleNotEditable",
      "invalidGame",
      "invalidHandle",
      "invalidId",
      "invalidRegion",
      "noAccountForGame",
    ]);
  });

  test("ningún texto nombra una fuente real (RNF-2)", () => {
    const texts = [
      ACCOUNT_ERRORS.invalidId,
      ACCOUNT_ERRORS.invalidGame,
      ...Object.values(ACCOUNT_ERRORS.invalidHandle),
      ACCOUNT_ERRORS.invalidRegion("lol"),
      ACCOUNT_ERRORS.duplicate,
      ACCOUNT_ERRORS.handleNotEditable,
      ACCOUNT_ERRORS.accountNotFound,
      ACCOUNT_ERRORS.noAccountForGame,
    ].join(" ");
    assert.doesNotMatch(texts, /valve|faceit|riot games|ubisoft connect|tracker/i);
  });
});

describe("isValidId (RF-13 formato, RF-29)", () => {
  test("24 hexadecimales, en mayúsculas o minúsculas", () => {
    assert.equal(isValidId(SESSION_ID), true);
    assert.equal(isValidId(OTHER_ID), true);
  });

  test("rechaza longitudes, caracteres y tipos inválidos", () => {
    for (const value of [
      "",
      "me",
      "65a1b2c3d4e5f6a7b8c9d0e",
      "65a1b2c3d4e5f6a7b8c9d0e12",
      "65a1b2c3d4e5f6a7b8c9d0eg",
      ` ${SESSION_ID}`,
      `${SESSION_ID}\n`,
      null,
      undefined,
      123,
      [SESSION_ID],
    ]) {
      assert.equal(isValidId(value), false, String(value));
    }
  });
});

describe("normalizeRegion (DP-35)", () => {
  test('" las " y "Las" → LAS', () => {
    assert.equal(normalizeRegion("lol", " las "), "LAS");
    assert.equal(normalizeRegion("lol", "Las"), "LAS");
  });

  test("grafía de la lista en los tres juegos", () => {
    assert.equal(normalizeRegion("r6", "latam"), "LATAM");
    assert.equal(normalizeRegion("cs2", "  south america "), "South America");
    assert.equal(normalizeRegion("cs2", "EUROPE"), "Europe");
  });

  test("región de otro juego o inexistente → null", () => {
    assert.equal(normalizeRegion("lol", "LATAM"), null);
    assert.equal(normalizeRegion("r6", "LAS"), null);
    assert.equal(normalizeRegion("cs2", "south  america"), null);
    assert.equal(normalizeRegion("lol", "toString"), null);
  });

  test("plegado solo ASCII: signo de kelvin, anchura completa y espacios interiores → null (T12)", () => {
    assert.equal(normalizeRegion("lol", "\u212AR"), null); // «KR» con U+212A
    assert.equal(normalizeRegion("lol", "\uFF2C\uFF21\uFF33"), null); // «ＬＡＳ»
    assert.equal(normalizeRegion("cs2", "South  America"), null);
    assert.equal(normalizeRegion("cs2", "south america"), "South America");
    assert.equal(normalizeRegion("lol", "kr"), "KR");
  });

  test("recorta tabulador y NBSP; \"lAs\" → LAS (T12)", () => {
    assert.equal(normalizeRegion("lol", " las "), "LAS");
    assert.equal(normalizeRegion("lol", "lAs"), "LAS");
    assert.equal(normalizeRegion("lol", "\tlas\t"), "LAS");
    assert.equal(normalizeRegion("lol", "\u00A0las\u00A0"), "LAS");
    assert.equal(normalizeRegion("cs2", "\t\u00A0europe\u00A0\t"), "Europe");
  });

  test("nulo, vacío, espacios o no texto → null", () => {
    for (const [label, value] of INVALID_VALUES) {
      assert.equal(normalizeRegion("lol", value), null, label);
    }
    assert.equal(normalizeRegion("lol", undefined), null);
  });
});

describe("validateLinkPayload (RF-6, RF-7)", () => {
  test("«KR» con signo de kelvin → región no válida (T12, DP-35)", () => {
    assert.deepEqual(
      validateLinkPayload({ gameId: "lol", handle: VALID.lol.handle, region: "\u212AR" }),
      fail(REGION_ERRORS.lol),
    );
  });

  test("válido en los tres juegos; solo devuelve juego, identificador y región", () => {
    for (const gameId of ["lol", "r6", "cs2"] as const) {
      const result = validateLinkPayload({
        gameId,
        ...VALID[gameId],
        user: OTHER_ID,
        currentRank: { tier: "Gold" },
        verified: true,
        readingNumber: 7,
        simulated: false,
      });
      assert.deepEqual(result, { ok: true, value: { gameId, ...VALID[gameId] } });
    }
  });

  test("identificador sin espacios en los extremos y con sus mayúsculas (DP-19)", () => {
    const result = validateLinkPayload({ gameId: "lol", handle: "  Jugador#LAS  ", region: "las" });
    assert.deepEqual(result, {
      ok: true,
      value: { gameId: "lol", handle: "Jugador#LAS", region: "LAS" },
    });
  });

  test("recorte del identificador: tabulador, NBSP y BOM en los extremos se quitan (T15, DP-19)", () => {
    const expected = { ok: true, value: { gameId: "lol", handle: "Jugador1#LAS", region: "LAS" } };
    for (const [label, handle] of [
      ["tabuladores", "\tJugador1#LAS\t"],
      ["espacios", " Jugador1#LAS "],
      ["NBSP", "\u00a0Jugador1#LAS\u00a0"],
      ["BOM", "\ufeffJugador1#LAS\ufeff"],
      ["mezcla", "\u00a0\t\ufeff Jugador1#LAS \ufeff\t\u00a0"],
    ] as const) {
      assert.deepEqual(validateLinkPayload({ gameId: "lol", handle, region: "LAS" }), expected, label);
    }
  });

  test("U+0085 no se recorta: al inicio cuenta dentro del nombre y al final rompe la etiqueta (T15, DP-19)", () => {
    // Al inicio: el nombre pasa a medir una unidad más y se guarda con el carácter.
    assert.deepEqual(validateLinkPayload({ gameId: "lol", handle: "\u0085ab#LAS", region: "LAS" }), {
      ok: true,
      value: { gameId: "lol", handle: "\u0085ab#LAS", region: "LAS" },
    });
    assert.deepEqual(
      validateLinkPayload({ gameId: "lol", handle: "\u0085a#LAS", region: "LAS" }),
      fail(HANDLE_ERRORS.lol),
      "nombre de 2 unidades contando U+0085",
    );
    // Al final: queda detrás de la etiqueta, que ya no es solo letras o dígitos.
    assert.deepEqual(
      validateLinkPayload({ gameId: "lol", handle: "Jugador1#LAS\u0085", region: "LAS" }),
      fail(HANDLE_ERRORS.lol),
    );
  });

  test("LoL: el nombre se mide en unidades UTF-16; un emoji cuenta dos (T15, DP-19)", () => {
    const emoji = "\u{1F600}";
    assert.equal(emoji.length, 2);
    const sixteen = `${emoji}${"a".repeat(14)}`;
    const seventeen = `${emoji}${"a".repeat(15)}`;
    assert.equal(sixteen.length, 16);
    assert.equal(seventeen.length, 17);
    assert.deepEqual(validateLinkPayload({ gameId: "lol", handle: `${sixteen}#LAS`, region: "LAS" }), {
      ok: true,
      value: { gameId: "lol", handle: `${sixteen}#LAS`, region: "LAS" },
    });
    assert.deepEqual(
      validateLinkPayload({ gameId: "lol", handle: `${seventeen}#LAS`, region: "LAS" }),
      fail(HANDLE_ERRORS.lol),
    );
    // Un emoji y una letra son 3 unidades (válido); el emoji solo, 2 (inválido).
    assert.equal(validateLinkPayload({ gameId: "lol", handle: `${emoji}a#LAS`, region: "LAS" }).ok, true);
    assert.deepEqual(
      validateLinkPayload({ gameId: "lol", handle: `${emoji}#LAS`, region: "LAS" }),
      fail(HANDLE_ERRORS.lol),
    );
  });

  test("LoL: límites 3 a 16 antes de # y 2 a 5 después (T15, RF-6)", () => {
    const check = (handle: string): boolean =>
      validateLinkPayload({ gameId: "lol", handle, region: "LAS" }).ok;
    assert.equal(check(`${"a".repeat(2)}#LAS`), false);
    assert.equal(check(`${"a".repeat(3)}#LAS`), true);
    assert.equal(check(`${"a".repeat(16)}#LAS`), true);
    assert.equal(check(`${"a".repeat(17)}#LAS`), false);
    assert.equal(check("Jugador#A"), false);
    assert.equal(check("Jugador#AB"), true);
    assert.equal(check("Jugador#AB123"), true);
    assert.equal(check("Jugador#AB1234"), false);
  });

  test("LoL: ejemplos válidos e inválidos de las Definiciones (T26, RF-6, DP-19)", () => {
    const link = (handle: string) => validateLinkPayload({ gameId: "lol", handle, region: "LAS" });
    // Válidos: espacio interior y letra no ASCII; nombre con # (el último # separa la etiqueta).
    for (const handle of ["Jugador1#LAS", "Ana Pérez#br1", "a#b#cd"]) {
      assert.deepEqual(link(handle), { ok: true, value: { gameId: "lol", handle, region: "LAS" } }, handle);
    }
    // Inválidos: nombre de 2, etiqueta de 1, etiqueta con guion, sin etiqueta.
    for (const handle of ["ab#LAS", "Jugador1#L", "Jugador1#LAS-1", "Jugador1"]) {
      assert.deepEqual(link(handle), fail(HANDLE_ERRORS.lol), handle);
    }
  });

  test("LoL: LF, CR, U+2028 y U+2029 dentro del nombre → inválido (T26, RF-6)", () => {
    for (const [label, terminator] of [
      ["LF", "\n"],
      ["CR", "\r"],
      ["U+2028", "\u2028"],
      ["U+2029", "\u2029"],
    ] as const) {
      for (const handle of [`ab${terminator}cd#LAS`, `a${terminator}b#LAS`, `abc${terminator}#LAS`]) {
        assert.deepEqual(
          validateLinkPayload({ gameId: "lol", handle, region: "LAS" }),
          fail(HANDLE_ERRORS.lol),
          `${label} en ${JSON.stringify(handle)}`,
        );
      }
    }
  });

  test('región " las " → LAS', () => {
    const result = validateLinkPayload({ gameId: "lol", handle: "Jugador#LAS", region: " las " });
    assert.equal(result.ok && result.value.region, "LAS");
  });

  test("cuerpo vacío o que no es objeto → juego no válido", () => {
    for (const body of [undefined, null, {}, [], "lol", 3, [{ gameId: "lol" }]]) {
      assert.deepEqual(validateLinkPayload(body), fail(GAME_ERROR), JSON.stringify(body));
    }
  });

  test("juego ausente, inválido o no texto → juego no válido", () => {
    for (const gameId of [undefined, "", " lol ", "LOL", "valorant", "toString", "__proto__", 1]) {
      const result = validateLinkPayload({ gameId, ...VALID.lol });
      assert.deepEqual(result, fail(GAME_ERROR), String(gameId));
    }
    for (const [label, value] of INVALID_VALUES) {
      assert.deepEqual(validateLinkPayload({ gameId: value, ...VALID.lol }), fail(GAME_ERROR), label);
    }
  });

  test("orden: el juego va antes que el identificador y la región", () => {
    const result = validateLinkPayload({ gameId: "xyz", handle: "", region: null });
    assert.deepEqual(result, fail(GAME_ERROR));
  });

  test("identificador inválido → texto de su juego, antes que la región", () => {
    for (const gameId of ["lol", "r6", "cs2"] as const) {
      const result = validateLinkPayload({ gameId, handle: "x", region: "nope" });
      assert.deepEqual(result, fail(HANDLE_ERRORS[gameId]), gameId);
    }
  });

  test("identificador nulo, vacío, espacios, no texto o ausente → texto de su juego", () => {
    for (const gameId of ["lol", "r6", "cs2"] as const) {
      for (const [label, value] of INVALID_VALUES) {
        const result = validateLinkPayload({ gameId, handle: value, region: VALID[gameId].region });
        assert.deepEqual(result, fail(HANDLE_ERRORS[gameId]), `${gameId} ${label}`);
      }
      const missing = validateLinkPayload({ gameId, region: VALID[gameId].region });
      assert.deepEqual(missing, fail(HANDLE_ERRORS[gameId]), `${gameId} ausente`);
    }
  });

  test("patrón de cada juego", () => {
    assert.deepEqual(
      validateLinkPayload({ gameId: "lol", handle: "Jugador", region: "LAS" }),
      fail(HANDLE_ERRORS.lol),
    );
    assert.deepEqual(
      validateLinkPayload({ gameId: "r6", handle: "con espacio", region: "LATAM" }),
      fail(HANDLE_ERRORS.r6),
    );
    assert.deepEqual(
      validateLinkPayload({ gameId: "cs2", handle: "7656119000000000", region: "Europe" }),
      fail(HANDLE_ERRORS.cs2),
    );
    // Un identificador de otro juego no vale.
    assert.deepEqual(
      validateLinkPayload({ gameId: "cs2", handle: VALID.lol.handle, region: "Europe" }),
      fail(HANDLE_ERRORS.cs2),
    );
  });

  test("R6: límites 3 a 20, punto, guion y guion bajo válidos, letra no ASCII inválida (T26, RF-6)", () => {
    const check = (handle: string): boolean =>
      validateLinkPayload({ gameId: "r6", handle, region: "LATAM" }).ok;
    assert.equal(check("a".repeat(2)), false);
    assert.equal(check("a".repeat(3)), true);
    assert.equal(check("a".repeat(20)), true);
    assert.equal(check("a".repeat(21)), false);
    assert.equal(check("a.b"), true);
    assert.equal(check("a-b"), true);
    assert.equal(check("a_b"), true);
    assert.equal(check("..."), true);
    assert.equal(check("---"), true);
    assert.equal(check("___"), true);
    assert.equal(check("Ana1.-_"), true);
    assert.equal(check("a\u00f1o"), false);
    assert.equal(check("\u00f1and\u00fa"), false);
    assert.equal(check("a#b"), false);
    assert.deepEqual(
      validateLinkPayload({ gameId: "r6", handle: "a".repeat(21), region: "LATAM" }),
      fail(HANDLE_ERRORS.r6),
    );
    assert.deepEqual(
      validateLinkPayload({ gameId: "r6", handle: "a\u00f1o", region: "LATAM" }),
      fail(HANDLE_ERRORS.r6),
    );
  });

  test("CS2: 17 dígitos ASCII con prefijo 7656119; 16 y 18 dígitos, otro prefijo o dígito no ASCII → inválido (T26, RF-6)", () => {
    const check = (handle: string): boolean =>
      validateLinkPayload({ gameId: "cs2", handle, region: "Europe" }).ok;
    assert.equal(check("76561190000000000"), true);
    assert.equal(check("76561199999999999"), true);
    assert.equal(check("7656119000000000"), false, "16 dígitos");
    assert.equal(check("765611900000000000"), false, "18 dígitos");
    assert.equal(check("76561180000000000"), false, "prefijo 7656118");
    assert.equal(check("86561190000000000"), false, "prefijo 8656119");
    assert.equal(check("00000000000000000"), false, "sin prefijo");
    // Dígito árabe-índico U+0660 (cuenta como \d en otros motores, no en ASCII).
    assert.equal(check("7656119000000000\u0660"), false, "U+0660 al final");
    assert.equal(check("7656119\u0660000000000"), false, "U+0660 dentro");
    assert.deepEqual(
      validateLinkPayload({ gameId: "cs2", handle: "7656119000000000\u0660", region: "Europe" }),
      fail(HANDLE_ERRORS.cs2),
    );
  });

  test("región nula, vacía, espacios, no texto, ausente o de otro juego → región no válida", () => {
    for (const gameId of ["lol", "r6", "cs2"] as const) {
      for (const [label, value] of INVALID_VALUES) {
        const result = validateLinkPayload({ gameId, handle: VALID[gameId].handle, region: value });
        assert.deepEqual(result, fail(REGION_ERRORS[gameId]), `${gameId} ${label}`);
      }
      const missing = validateLinkPayload({ gameId, handle: VALID[gameId].handle });
      assert.deepEqual(missing, fail(REGION_ERRORS[gameId]), `${gameId} ausente`);
    }
    assert.deepEqual(
      validateLinkPayload({ gameId: "lol", handle: VALID.lol.handle, region: "LATAM" }),
      fail(REGION_ERRORS.lol),
    );
  });
});

describe("validateAccountEdit (RF-7, RF-22, RF-38, RF-40)", () => {
  const account = { gameId: "lol" as const, handle: "Jugador#LAS" };

  test("«KR» con signo de kelvin → región no válida (T12, DP-35)", () => {
    assert.deepEqual(validateAccountEdit(account, { region: "\u212AR" }), fail(REGION_ERRORS.lol));
  });

  test("cuerpo vacío o que no es objeto → sin cambios", () => {
    for (const body of [undefined, null, {}, [], "x", 5, [{ region: "nope" }]]) {
      assert.deepEqual(validateAccountEdit(account, body), { ok: true, value: {} }, String(body));
    }
  });

  test("solo campos ignorados (incluido el juego) → sin cambios", () => {
    const result = validateAccountEdit(account, {
      gameId: "valorant",
      user: OTHER_ID,
      currentRank: null,
      verified: false,
      simulated: false,
    });
    assert.deepEqual(result, { ok: true, value: {} });
  });

  test("región válida con otra grafía → grafía de la lista", () => {
    assert.deepEqual(validateAccountEdit(account, { region: " lan " }), {
      ok: true,
      value: { region: "LAN" },
    });
  });

  test("gameId del cuerpo ignorado: la región se valida con el juego de la cuenta", () => {
    assert.deepEqual(validateAccountEdit(account, { gameId: "r6", region: "LATAM" }), fail(REGION_ERRORS.lol));
    assert.deepEqual(validateAccountEdit(account, { gameId: "r6", region: "LAS" }), {
      ok: true,
      value: { region: "LAS" },
    });
    assert.deepEqual(validateAccountEdit(account, { gameId: "xyz", region: "las" }), {
      ok: true,
      value: { region: "LAS" },
    });
  });

  test("el mismo identificador con otras mayúsculas o espacios se ignora", () => {
    for (const handle of ["Jugador#LAS", "jugador#las", "  JUGADOR#las  "]) {
      assert.deepEqual(validateAccountEdit(account, { handle }), { ok: true, value: {} }, handle);
      assert.deepEqual(
        validateAccountEdit(account, { handle, region: "NA" }),
        { ok: true, value: { region: "NA" } },
        handle,
      );
    }
  });

  test("identificador distinto, nulo, vacío, espacios o no texto → RF-22", () => {
    const values: unknown[] = ["Otro#LAS", "Jugador#LAN", null, "", "   ", 42, ["Jugador#LAS"], {}];
    for (const handle of values) {
      assert.deepEqual(validateAccountEdit(account, { handle }), fail(EDIT_HANDLE_ERROR), String(handle));
    }
  });

  test("RF-22 va antes que RF-38", () => {
    assert.deepEqual(
      validateAccountEdit(account, { handle: "Otro#LAS", region: "nope" }),
      fail(EDIT_HANDLE_ERROR),
    );
    assert.deepEqual(validateAccountEdit(account, { handle: null, region: null }), fail(EDIT_HANDLE_ERROR));
  });

  test("región nula, vacía, espacios, no texto o de otro juego → RF-38", () => {
    for (const [label, value] of INVALID_VALUES) {
      assert.deepEqual(validateAccountEdit(account, { region: value }), fail(REGION_ERRORS.lol), label);
    }
    assert.deepEqual(validateAccountEdit(account, { region: "Europe" }), fail(REGION_ERRORS.lol));
  });

  test("mismo identificador + región inválida → RF-38 con el nombre del juego de la cuenta", () => {
    const r6 = { gameId: "r6" as const, handle: "Tu.Nombre" };
    assert.deepEqual(validateAccountEdit(r6, { handle: "tu.nombre", region: "LAS" }), fail(REGION_ERRORS.r6));
    const cs2 = { gameId: "cs2" as const, handle: "76561190000000001" };
    assert.deepEqual(validateAccountEdit(cs2, { region: "" }), fail(REGION_ERRORS.cs2));
  });
});

describe("parseAccountFilters (RF-2, DP-10)", () => {
  test("sin filtros → {}", () => {
    assert.deepEqual(parseAccountFilters({}, SESSION_ID), { ok: true, value: {} });
  });

  test("user=me → id de la sesión", () => {
    assert.deepEqual(parseAccountFilters({ user: "me" }, SESSION_ID), {
      ok: true,
      value: { userId: SESSION_ID },
    });
  });

  test("user con formato válido → id en minúsculas; game válido", () => {
    assert.deepEqual(parseAccountFilters({ user: OTHER_ID, game: "cs2" }, SESSION_ID), {
      ok: true,
      value: { userId: OTHER_ID.toLowerCase(), gameId: "cs2" },
    });
    assert.deepEqual(parseAccountFilters({ game: "r6" }, SESSION_ID), {
      ok: true,
      value: { gameId: "r6" },
    });
  });

  test("objeto de consulta sin prototipo (Express 5)", () => {
    const query: Record<string, unknown> = Object.create(null);
    query.user = "me";
    query.game = "lol";
    assert.deepEqual(parseAccountFilters(query, SESSION_ID), {
      ok: true,
      value: { userId: SESSION_ID, gameId: "lol" },
    });
  });

  test("user repetido, vacío o inválido → id con formato inválido", () => {
    const values: unknown[] = [
      [SESSION_ID, SESSION_ID],
      ["me", "me"],
      "",
      "abc",
      "ME",
      " me",
      `${SESSION_ID} `,
      "65a1b2c3d4e5f6a7b8c9d0e",
      null,
      5,
    ];
    for (const user of values) {
      assert.deepEqual(parseAccountFilters({ user }, SESSION_ID), fail(ID_ERROR), String(user));
    }
  });

  test("user inválido y game inválido → solo el error del usuario", () => {
    assert.deepEqual(parseAccountFilters({ user: "abc", game: "xyz" }, SESSION_ID), fail(ID_ERROR));
    assert.deepEqual(parseAccountFilters({ user: "", game: "" }, SESSION_ID), fail(ID_ERROR));
    assert.deepEqual(
      parseAccountFilters({ user: ["me", "me"], game: ["lol", "cs2"] }, SESSION_ID),
      fail(ID_ERROR),
    );
  });

  test("game repetido, vacío o inválido → juego no válido", () => {
    const values: unknown[] = [["lol", "cs2"], ["lol", "lol"], "", " lol", "LOL", "xyz", "toString", null];
    for (const game of values) {
      assert.deepEqual(parseAccountFilters({ game }, SESSION_ID), fail(GAME_ERROR), String(game));
      assert.deepEqual(parseAccountFilters({ user: "me", game }, SESSION_ID), fail(GAME_ERROR), String(game));
    }
  });

  test("otros parámetros se ignoran", () => {
    assert.deepEqual(parseAccountFilters({ page: "2", gameId: "xyz" }, SESSION_ID), {
      ok: true,
      value: {},
    });
  });
});
