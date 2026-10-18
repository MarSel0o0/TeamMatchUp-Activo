import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  AVATAR_COLOR_PATTERN,
  PROFILE_LIMITS,
  PROFILE_MESSAGES,
  isValidAvatarColor,
  validateProfileUpdate,
  type ProfileUpdate,
} from "../../src/services/profile.ts";
import { MESSAGES as CREDENTIAL_MESSAGES } from "../../src/services/credentials.ts";

const FIELDS = ["displayName", "bio", "timezone", "avatarColor"] as const;
type Field = (typeof FIELDS)[number];

const TYPE_MESSAGES: Record<Field, string> = {
  displayName: PROFILE_MESSAGES.displayNameType,
  bio: PROFILE_MESSAGES.bioType,
  timezone: PROFILE_MESSAGES.timezoneType,
  avatarColor: PROFILE_MESSAGES.avatarColorType,
};

const NBSP = " ";
const BOM = "﻿";
const NEL = "\u0085";
const EMOJI = "\u{1F3AE}"; // 2 unidades UTF-16

function okValue(body: unknown): ProfileUpdate {
  const result = validateProfileUpdate(body);
  assert.ok(result.ok, `se esperaba ok y llegó: ${result.ok ? "" : result.error}`);
  return result.value;
}

function errorOf(body: unknown): string {
  const result = validateProfileUpdate(body);
  assert.ok(!result.ok, "se esperaba un error");
  return result.error;
}

describe("cuerpos sin campos del perfil (RF-7, RF-9)", () => {
  const cases: [string, unknown][] = [
    ["sin cuerpo (undefined)", undefined],
    ["null", null],
    ["{}", {}],
    ["lista JSON", [{ displayName: "Ana" }]],
    ["lista vacía", []],
    ["texto", "displayName=Ana"],
    ["número", 5],
    [
      "solo campos ignorados",
      {
        id: "aaaaaaaaaaaaaaaaaaaaaaaa",
        email: "x@y.com",
        username: "otro",
        password: "secreto123",
        passwordHash: "hash",
        createdAt: "2020-01-01T00:00:00.000Z",
        availability: ["2-20"],
      },
    ],
  ];
  for (const [name, body] of cases) {
    test(`${name} → ok {}`, () => {
      assert.deepEqual(okValue(body), {});
    });
  }

  test("una propiedad heredada no cuenta como enviada", () => {
    const body: unknown = Object.create({ displayName: 5, bio: null });
    assert.deepEqual(okValue(body), {});
  });
});

describe("tipo de cada campo (RF-17)", () => {
  const wrongValues: [string, unknown][] = [
    ["null", null],
    ["número", 5],
    ["booleano", true],
    ["lista", ["Ana"]],
    ["objeto", { $ne: null }],
  ];
  for (const field of FIELDS) {
    for (const [name, value] of wrongValues) {
      test(`${field} con ${name} → ${TYPE_MESSAGES[field]}`, () => {
        assert.equal(errorOf({ [field]: value }), TYPE_MESSAGES[field]);
      });
    }
  }
});

describe("nombre visible (RF-8, RF-15, RF-21)", () => {
  test("vacío → no puede estar vacío", () => {
    assert.equal(errorOf({ displayName: "" }), PROFILE_MESSAGES.displayNameEmpty);
  });

  test("solo espacios (incluidos \\n, \\t, NBSP y BOM) → no puede estar vacío", () => {
    assert.equal(errorOf({ displayName: "   " }), PROFILE_MESSAGES.displayNameEmpty);
    assert.equal(errorOf({ displayName: ` \n\t${NBSP}${BOM} ` }), PROFILE_MESSAGES.displayNameEmpty);
  });

  test("40 caracteres tras recortar, con espacios alrededor → ok recortado", () => {
    const name = "a".repeat(40);
    assert.deepEqual(okValue({ displayName: `  ${name}\n` }), { displayName: name });
  });

  test("41 caracteres → demasiado largo", () => {
    assert.equal(errorOf({ displayName: "a".repeat(41) }), PROFILE_MESSAGES.displayNameTooLong);
  });

  test("20 emojis (40 unidades UTF-16) → ok; 21 → demasiado largo", () => {
    assert.deepEqual(okValue({ displayName: EMOJI.repeat(20) }), { displayName: EMOJI.repeat(20) });
    assert.equal(errorOf({ displayName: EMOJI.repeat(21) }), PROFILE_MESSAGES.displayNameTooLong);
  });

  test("los espacios interiores se conservan", () => {
    assert.deepEqual(okValue({ displayName: " Ana  María " }), { displayName: "Ana  María" });
  });
});

describe("biografía (RF-8, RF-21)", () => {
  test("200 caracteres tras recortar → ok recortada", () => {
    const bio = "b".repeat(200);
    assert.deepEqual(okValue({ bio: `\t${bio} ` }), { bio });
  });

  test("201 caracteres → demasiado larga", () => {
    assert.equal(errorOf({ bio: "b".repeat(201) }), PROFILE_MESSAGES.bioTooLong);
  });

  test("100 emojis (200 unidades) → ok; 101 → demasiado larga", () => {
    assert.deepEqual(okValue({ bio: EMOJI.repeat(100) }), { bio: EMOJI.repeat(100) });
    assert.equal(errorOf({ bio: EMOJI.repeat(101) }), PROFILE_MESSAGES.bioTooLong);
  });

  test("vacía o solo espacios → biografía vacía", () => {
    assert.deepEqual(okValue({ bio: "" }), { bio: "" });
    assert.deepEqual(okValue({ bio: ` \n${NBSP} ` }), { bio: "" });
  });
});

describe("zona horaria (RF-16, RF-21)", () => {
  test("válidas → ok tal cual", () => {
    for (const zone of [
      "America/Santiago",
      "America/Argentina/Buenos_Aires",
      "Europe/Amsterdam",
      "Europe/Oslo",
      "Asia/Kuala_Lumpur",
      "UTC",
    ]) {
      assert.deepEqual(okValue({ timezone: zone }), { timezone: zone }, zone);
    }
  });

  test("recortes en los extremos (espacio, \\n, \\t, NBSP, BOM) → ok recortada", () => {
    for (const raw of [
      " America/Santiago ",
      "America/Santiago\n",
      "\tAmerica/Santiago",
      `${NBSP}America/Santiago${NBSP}`,
      `${BOM}America/Santiago${BOM}`,
    ]) {
      assert.deepEqual(okValue({ timezone: raw }), { timezone: "America/Santiago" }, JSON.stringify(raw));
    }
  });

  test("NEL (U+0085) no se recorta → inválida", () => {
    assert.equal(errorOf({ timezone: `${NEL}UTC` }), PROFILE_MESSAGES.timezoneInvalid);
    assert.equal(errorOf({ timezone: `America/Santiago${NEL}` }), PROFILE_MESSAGES.timezoneInvalid);
  });

  test("inválidas, incluidas vacía y solo espacios → no es válida", () => {
    for (const zone of [
      "US/Eastern",
      "America/Buenos_Aires",
      "Asia/Calcutta",
      "GMT",
      "Etc/UTC",
      "Etc/GMT-3",
      "america/santiago",
      "Santiago",
      "GMT-3",
      "CET",
      "EST5EDT",
      "EST",
      "HST",
      "Factory",
      "America/ Santiago",
      "",
      "   ",
    ]) {
      assert.equal(errorOf({ timezone: zone }), PROFILE_MESSAGES.timezoneInvalid, JSON.stringify(zone));
    }
  });
});

describe("color de avatar (RF-8, RF-21)", () => {
  test("mayúsculas, mezcla y recortes → guardado en minúsculas y recortado", () => {
    for (const raw of ["#ABCDEF", " #AbCdEf ", "#abcdef\t", `${NBSP}#abcdef${BOM}`, "#abcdef"]) {
      assert.deepEqual(okValue({ avatarColor: raw }), { avatarColor: "#abcdef" }, JSON.stringify(raw));
    }
  });

  test("formatos inválidos, incluidos vacío y solo espacios → forma #RRGGBB", () => {
    for (const raw of ["#abc", "abcdef", "", "   ", "#abcdeg", "#abcdef0", "##abcdef", "# abcdef", `${NEL}#abcdef`]) {
      assert.equal(errorOf({ avatarColor: raw }), PROFILE_MESSAGES.avatarColorFormat, JSON.stringify(raw));
    }
  });

  test("isValidAvatarColor espera el valor ya recortado", () => {
    assert.equal(isValidAvatarColor("#A1b2C3"), true);
    assert.equal(isValidAvatarColor(" #a1b2c3"), false);
    assert.equal(isValidAvatarColor("#a1b2c"), false);
  });
});

describe("orden de revisión (RF-19)", () => {
  test("nombre de 41 + color #abc → largo del nombre", () => {
    assert.equal(
      errorOf({ avatarColor: "#abc", displayName: "a".repeat(41) }),
      PROFILE_MESSAGES.displayNameTooLong,
    );
  });

  test("biografía null + zona inválida → tipo de biografía", () => {
    assert.equal(errorOf({ timezone: "GMT", bio: null }), PROFILE_MESSAGES.bioType);
  });

  test("zona inválida + color inválido → zona", () => {
    assert.equal(errorOf({ avatarColor: "rojo", timezone: "Santiago" }), PROFILE_MESSAGES.timezoneInvalid);
  });

  test("nombre 5 + biografía de 201 → tipo del nombre", () => {
    assert.equal(errorOf({ bio: "b".repeat(201), displayName: 5 }), PROFILE_MESSAGES.displayNameType);
  });

  test("nombre válido + color con tipo incorrecto → tipo del color", () => {
    assert.equal(errorOf({ displayName: "Ana", avatarColor: 123 }), PROFILE_MESSAGES.avatarColorType);
  });

  test("dentro del nombre: el tipo antes que el vacío y el vacío antes que el largo", () => {
    assert.equal(errorOf({ displayName: [] }), PROFILE_MESSAGES.displayNameType);
    assert.equal(errorOf({ displayName: " " }), PROFILE_MESSAGES.displayNameEmpty);
  });
});

describe("claves del valor (RF-7, RF-9, RF-21)", () => {
  test("solo las claves de los campos enviados", () => {
    assert.deepEqual(okValue({ bio: " hola ", email: "x@y.com", username: "otro" }), { bio: "hola" });
    assert.deepEqual(Object.keys(okValue({ timezone: "UTC", id: "x" })), ["timezone"]);
  });

  test("los cuatro a la vez → los cuatro normalizados", () => {
    assert.deepEqual(
      okValue({
        displayName: " Ana ",
        bio: " Jugadora ",
        timezone: " UTC ",
        avatarColor: " #FF00AA ",
        password: "nueva-clave",
      }),
      { displayName: "Ana", bio: "Jugadora", timezone: "UTC", avatarColor: "#ff00aa" },
    );
  });
});

describe("constantes y mensajes (RNF-3, RNF-4)", () => {
  test("límites y patrón", () => {
    assert.deepEqual(PROFILE_LIMITS, { displayNameMax: 40, bioMax: 200 });
    assert.equal(AVATAR_COLOR_PATTERN.source, "^#[0-9a-fA-F]{6}$");
  });

  test("textos literales de la spec", () => {
    assert.deepEqual(PROFILE_MESSAGES, {
      displayNameType: "el nombre visible debe ser un texto",
      displayNameEmpty: "el nombre visible no puede estar vacío",
      displayNameTooLong: "el nombre visible no puede superar 40 caracteres",
      bioType: "la biografía debe ser un texto",
      bioTooLong: "la biografía no puede superar 200 caracteres",
      timezoneType: "la zona horaria debe ser un texto",
      timezoneInvalid: "la zona horaria no es válida",
      avatarColorType: "el color de avatar debe ser un texto",
      avatarColorFormat: "el color de avatar debe tener la forma #RRGGBB",
    });
  });

  test("coinciden con los textos de la 002 donde la spec lo exige", () => {
    assert.equal(PROFILE_MESSAGES.displayNameType, CREDENTIAL_MESSAGES.displayNameType);
    assert.equal(PROFILE_MESSAGES.displayNameTooLong, CREDENTIAL_MESSAGES.displayNameTooLong);
  });

  test("cada mensaje empieza en minúscula y no termina en punto (salvo #RRGGBB literal)", () => {
    for (const [key, message] of Object.entries(PROFILE_MESSAGES)) {
      assert.match(message, /^\p{Ll}/u, key);
      assert.ok(!message.endsWith("."), key);
      assert.equal(message, message.trim(), key);
      assert.equal(message.replace("#RRGGBB", ""), message.replace("#RRGGBB", "").toLowerCase(), key);
    }
  });
});
