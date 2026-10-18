import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  EMAIL_PATTERN,
  LIMITS,
  MESSAGES,
  USERNAME_PATTERN,
  normalizeEmail,
  readField,
  usernameKey,
  validateLogin,
  validateRegistration,
} from "../../src/services/credentials.ts";
import { MAX_PASSWORD_BYTES } from "../../src/services/passwords.ts";

const VALID = {
  email: "ana@dominio.cl",
  username: "Ana",
  password: "secreta123",
  displayName: "Ana Pérez",
} as const;

function registrationError(body: unknown): string {
  const result = validateRegistration(body);
  assert.equal(result.ok, false, "se esperaba un error de validación");
  return result.ok ? "" : result.error;
}

function registrationValue(body: unknown) {
  const result = validateRegistration(body);
  if (!result.ok) {
    assert.fail(`se esperaba un registro válido y se obtuvo "${result.error}"`);
  }
  return result.value;
}

function loginError(body: unknown): string {
  const result = validateLogin(body);
  assert.equal(result.ok, false, "se esperaba un error de validación");
  return result.ok ? "" : result.error;
}

function loginValue(body: unknown) {
  const result = validateLogin(body);
  if (!result.ok) {
    assert.fail(`se esperaba un inicio válido y se obtuvo "${result.error}"`);
  }
  return result.value;
}

// Copia de VALID sin la clave indicada (campo que no viene en el cuerpo).
function without(key: keyof typeof VALID): Record<string, string> {
  const copy: Record<string, string> = { ...VALID };
  delete copy[key];
  return copy;
}

// Correo de exactamente `length` caracteres con formato válido.
function emailOfLength(length: number): string {
  const local = "a".repeat(64);
  const suffix = ".cl";
  const domain = "b".repeat(length - local.length - 1 - suffix.length);
  return `${local}@${domain}${suffix}`;
}

describe("constantes", () => {
  test("límites de la spec", () => {
    assert.deepEqual(LIMITS, {
      emailMax: 254,
      usernameMin: 3,
      usernameMax: 24,
      passwordMin: 8,
      passwordMaxBytes: 72,
      displayNameMax: 40,
    });
    assert.equal(LIMITS.passwordMaxBytes, MAX_PASSWORD_BYTES);
  });

  test("EMAIL_PATTERN es la regla del formulario de registro", () => {
    assert.equal(EMAIL_PATTERN.source, String.raw`^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`);
  });

  test("USERNAME_PATTERN admite letras ASCII, dígitos, punto, guion y guion bajo", () => {
    assert.ok(USERNAME_PATTERN.test("Ana.b-c_9"));
    assert.ok(!USERNAME_PATTERN.test("añá"));
    assert.ok(!USERNAME_PATTERN.test("ana b"));
  });
});

describe("readField (RF-16)", () => {
  test("devuelve el valor de una propiedad propia", () => {
    assert.equal(readField({ email: "x" }, "email"), "x");
    assert.equal(readField({ email: null }, "email"), null);
  });

  test("las claves heredadas no cuentan como campos", () => {
    assert.equal(readField({}, "toString"), undefined);
    assert.equal(readField({}, "constructor"), undefined);
    assert.equal(readField({}, "__proto__"), undefined);
    assert.equal(readField({}, "hasOwnProperty"), undefined);
  });

  test("un cuerpo que no es un objeto no tiene campos", () => {
    assert.equal(readField(undefined, "email"), undefined);
    assert.equal(readField(null, "email"), undefined);
    assert.equal(readField("email", "email"), undefined);
    assert.equal(readField(42, "email"), undefined);
    assert.equal(readField(["a@b.cl"], "0"), undefined);
    assert.equal(readField(["a@b.cl"], "length"), undefined);
  });
});

describe("normalizeEmail y usernameKey (RF-3, RF-7)", () => {
  test("normalizeEmail recorta y pasa a minúsculas, también la parte local", () => {
    assert.equal(normalizeEmail("  Ana.Perez@Dominio.CL  "), "ana.perez@dominio.cl");
    assert.equal(normalizeEmail("JOSÉ@DOMINIO.CL"), "josé@dominio.cl");
  });

  test("usernameKey no distingue mayúsculas", () => {
    assert.equal(usernameKey("Ana"), "ana");
    assert.equal(usernameKey("ANA"), "ana");
    assert.equal(usernameKey("ana"), "ana");
  });
});

describe("validateRegistration: datos válidos", () => {
  test("devuelve solo los cuatro campos normalizados y la clave del usuario", () => {
    const value = registrationValue({ ...VALID });
    assert.deepEqual(value, {
      email: "ana@dominio.cl",
      username: "Ana",
      usernameKey: "ana",
      password: "secreta123",
      displayName: "Ana Pérez",
    });
  });

  test("correo con mayúsculas y letras internacionales se guarda en minúsculas (RF-7)", () => {
    const value = registrationValue({ ...VALID, email: "  José@Dominio.CL " });
    assert.equal(value.email, "josé@dominio.cl");
  });

  test('nombre de usuario "  Ana  " se guarda recortado y tal como se escribió (RF-3, RF-7)', () => {
    const value = registrationValue({ ...VALID, username: "  Ana  " });
    assert.equal(value.username, "Ana");
    assert.equal(value.usernameKey, "ana");
  });

  test("nombre de usuario de 3 y de 24 caracteres se acepta", () => {
    assert.equal(registrationValue({ ...VALID, username: "abc" }).username, "abc");
    assert.equal(registrationValue({ ...VALID, username: "a".repeat(24) }).username, "a".repeat(24));
  });

  test("ignora cualquier campo distinto de los cuatro del registro (RF-16)", () => {
    const value = registrationValue({
      ...VALID,
      id: "665f00000000000000000000",
      _id: "665f00000000000000000000",
      passwordHash: "$2b$10$x",
      usernameKey: "otra",
      createdAt: "2020-01-01",
      timezone: "Europe/Madrid",
      avatarColor: "#000000",
      bio: "hola",
    });
    assert.deepEqual(Object.keys(value).sort(), [
      "displayName",
      "email",
      "password",
      "username",
      "usernameKey",
    ]);
    assert.equal(value.usernameKey, "ana");
  });

  test("correo de 254 caracteres tras recortar y con formato válido se acepta (RF-5)", () => {
    const email = emailOfLength(254);
    assert.equal(email.length, 254);
    assert.equal(registrationValue({ ...VALID, email: `  ${email}  ` }).email, email);
  });
});

describe("validateRegistration: contraseña (RF-4)", () => {
  test("7 caracteres: demasiado corta", () => {
    assert.equal(registrationError({ ...VALID, password: "1234567" }), MESSAGES.passwordTooShort);
  });

  test("8 espacios: válida y sin recortar", () => {
    assert.equal(registrationValue({ ...VALID, password: "        " }).password, "        ");
  });

  test("los espacios de los extremos cuentan y se conservan", () => {
    assert.equal(registrationValue({ ...VALID, password: " secreta " }).password, " secreta ");
    assert.equal(registrationError({ ...VALID, password: " abc12 " }), MESSAGES.passwordTooShort);
  });

  test("72 bytes (36 ñ o 18 emojis) se acepta", () => {
    assert.equal(registrationValue({ ...VALID, password: "ñ".repeat(36) }).password, "ñ".repeat(36));
    assert.equal(registrationValue({ ...VALID, password: "😀".repeat(18) }).password, "😀".repeat(18));
  });

  test("73 bytes (36 ñ y una a): no puede superar 72 bytes", () => {
    assert.equal(
      registrationError({ ...VALID, password: `${"ñ".repeat(36)}a` }),
      MESSAGES.passwordTooLong,
    );
  });
});

describe("validateRegistration: mensajes de RF-5", () => {
  test("falta el correo", () => {
    assert.equal(registrationError(without("email")), MESSAGES.emailMissing);
    assert.equal(registrationError({ ...VALID, email: "" }), MESSAGES.emailMissing);
    assert.equal(registrationError({ ...VALID, email: null }), MESSAGES.emailMissing);
    assert.equal(registrationError({ ...VALID, email: "   " }), MESSAGES.emailMissing);
  });

  test("falta el nombre de usuario", () => {
    assert.equal(registrationError(without("username")), MESSAGES.usernameMissing);
    assert.equal(registrationError({ ...VALID, username: "" }), MESSAGES.usernameMissing);
    assert.equal(registrationError({ ...VALID, username: null }), MESSAGES.usernameMissing);
    assert.equal(registrationError({ ...VALID, username: "  " }), MESSAGES.usernameMissing);
  });

  test("falta la contraseña (solo ausente, null o vacía)", () => {
    assert.equal(registrationError(without("password")), MESSAGES.passwordMissing);
    assert.equal(registrationError({ ...VALID, password: "" }), MESSAGES.passwordMissing);
    assert.equal(registrationError({ ...VALID, password: null }), MESSAGES.passwordMissing);
  });

  test("correo de 255 caracteres: demasiado largo aunque además tenga formato inválido", () => {
    assert.equal(registrationError({ ...VALID, email: emailOfLength(255) }), MESSAGES.emailTooLong);
    assert.equal(registrationError({ ...VALID, email: "a".repeat(255) }), MESSAGES.emailTooLong);
  });

  test("correo sin formato válido", () => {
    for (const email of ["ana", "ana@", "@dominio.cl", "ana@dominio", "ana@dominio.c",
      "ana pérez@dominio.cl", "ana@@dominio.cl", "ana@dom@inio.cl"]) {
      assert.equal(registrationError({ ...VALID, email }), MESSAGES.emailFormat, email);
    }
  });

  test('nombre de usuario "  ab  " recortado tiene 2 caracteres: longitud', () => {
    assert.equal(registrationError({ ...VALID, username: "  ab  " }), MESSAGES.usernameLength);
  });

  test("nombre de usuario de 25 caracteres: longitud", () => {
    assert.equal(registrationError({ ...VALID, username: "a".repeat(25) }), MESSAGES.usernameLength);
  });

  test("nombre de usuario con caracteres no admitidos", () => {
    for (const username of ["ana pérez", "añá", "ana!", "ana@b"]) {
      assert.equal(registrationError({ ...VALID, username }), MESSAGES.usernameChars, username);
    }
  });

  test('en el nombre de usuario la longitud va antes que los caracteres ("a!") (D9)', () => {
    assert.equal(registrationError({ ...VALID, username: "a!" }), MESSAGES.usernameLength);
  });
});

describe("validateRegistration: nombre visible (RF-6)", () => {
  test("ausente, null, vacío o solo espacios: usa el nombre de usuario", () => {
    assert.equal(registrationValue(without("displayName")).displayName, "Ana");
    assert.equal(registrationValue({ ...VALID, displayName: null }).displayName, "Ana");
    assert.equal(registrationValue({ ...VALID, displayName: "" }).displayName, "Ana");
    assert.equal(registrationValue({ ...VALID, displayName: "   " }).displayName, "Ana");
    assert.equal(
      registrationValue({ ...VALID, username: "  Ana  ", displayName: "  " }).displayName,
      "Ana",
    );
  });

  test("se guarda recortado", () => {
    assert.equal(registrationValue({ ...VALID, displayName: "  Ana P  " }).displayName, "Ana P");
  });

  test("40 caracteres tras recortar se acepta; 41 no", () => {
    const forty = "x".repeat(40);
    assert.equal(registrationValue({ ...VALID, displayName: `  ${forty}  ` }).displayName, forty);
    assert.equal(
      registrationError({ ...VALID, displayName: "x".repeat(41) }),
      MESSAGES.displayNameTooLong,
    );
  });
});

describe("validateRegistration: orden entre campos (RF-5)", () => {
  test("cuerpo ausente o no JSON: falta el correo", () => {
    assert.equal(registrationError(undefined), MESSAGES.emailMissing);
    assert.equal(registrationError(null), MESSAGES.emailMissing);
    assert.equal(registrationError({}), MESSAGES.emailMissing);
    assert.equal(registrationError([]), MESSAGES.emailMissing);
    assert.equal(registrationError("texto"), MESSAGES.emailMissing);
  });

  test("correo y nombre de usuario inválidos: error del correo", () => {
    assert.equal(
      registrationError({ ...VALID, email: "ana", username: "a!" }),
      MESSAGES.emailFormat,
    );
  });

  test("nombre de usuario y contraseña inválidos: error del nombre de usuario", () => {
    assert.equal(
      registrationError({ ...VALID, username: "a!", password: "1" }),
      MESSAGES.usernameLength,
    );
  });

  test("contraseña y nombre visible inválidos: error de la contraseña", () => {
    assert.equal(
      registrationError({ ...VALID, password: "1", displayName: "x".repeat(41) }),
      MESSAGES.passwordTooShort,
    );
  });

  test("todo ausente: falta el correo", () => {
    assert.equal(
      registrationError({ email: null, username: null, password: null, displayName: null }),
      MESSAGES.emailMissing,
    );
  });

  test("tipo incorrecto en un campo posterior no adelanta su error (D9)", () => {
    assert.equal(registrationError({ ...VALID, email: "ana", password: 12345678 }), MESSAGES.emailFormat);
    assert.equal(registrationError({ ...VALID, username: "  ", displayName: 5 }), MESSAGES.usernameMissing);
  });
});

describe("validateRegistration: tipos (RF-19)", () => {
  const wrongValues: readonly unknown[] = [42, 0, true, false, [], ["a@b.cl"], {}, { $ne: null }];
  const fields = [
    ["email", MESSAGES.emailType],
    ["username", MESSAGES.usernameType],
    ["password", MESSAGES.passwordType],
    ["displayName", MESSAGES.displayNameType],
  ] as const;

  for (const [field, message] of fields) {
    test(`${field} que no es texto: "${message}"`, () => {
      for (const wrong of wrongValues) {
        assert.equal(
          registrationError({ ...VALID, [field]: wrong }),
          message,
          `${field} = ${JSON.stringify(wrong)}`,
        );
      }
    });
  }
});

describe("validateLogin (RF-7, RF-16, RF-18, RF-19)", () => {
  test("devuelve el correo normalizado y la contraseña sin tocar", () => {
    assert.deepEqual(loginValue({ email: "  Ana@Dominio.CL ", password: " secreta " }), {
      email: "ana@dominio.cl",
      password: " secreta ",
    });
  });

  test("ignora cualquier campo distinto de correo y contraseña (RF-16)", () => {
    const value = loginValue({ email: "ana@dominio.cl", password: "secreta123", username: "Ana", id: "x" });
    assert.deepEqual(Object.keys(value).sort(), ["email", "password"]);
  });

  test("faltan ambos: falta el correo", () => {
    assert.equal(loginError({}), MESSAGES.emailMissing);
    assert.equal(loginError(undefined), MESSAGES.emailMissing);
    assert.equal(loginError({ email: null, password: null }), MESSAGES.emailMissing);
  });

  test('correo "", null o solo espacios: falta el correo', () => {
    for (const email of ["", null, "   "]) {
      assert.equal(loginError({ email, password: "secreta123" }), MESSAGES.emailMissing);
    }
  });

  test('contraseña ausente, "" o null: falta la contraseña', () => {
    assert.equal(loginError({ email: "ana@dominio.cl" }), MESSAGES.passwordMissing);
    assert.equal(loginError({ email: "ana@dominio.cl", password: "" }), MESSAGES.passwordMissing);
    assert.equal(loginError({ email: "ana@dominio.cl", password: null }), MESSAGES.passwordMissing);
  });

  test("contraseña solo de espacios: no es ausente", () => {
    assert.equal(loginValue({ email: "ana@dominio.cl", password: "   " }).password, "   ");
  });

  test("no valida formato, longitud ni reglas de contraseña al iniciar sesión", () => {
    assert.equal(loginValue({ email: "Sin-Formato", password: "x" }).email, "sin-formato");
    const long = "A".repeat(300);
    assert.equal(loginValue({ email: long, password: "x" }).email, "a".repeat(300));
    assert.equal(loginValue({ email: "ana@dominio.cl", password: "ñ".repeat(40) }).password, "ñ".repeat(40));
  });

  test("correo que no es texto: el correo debe ser un texto", () => {
    for (const email of [42, true, [], ["ana@dominio.cl"], {}, { $ne: null }]) {
      assert.equal(loginError({ email, password: "secreta123" }), MESSAGES.emailType);
    }
  });

  test("contraseña que no es texto: la contraseña debe ser un texto", () => {
    for (const password of [12345678, false, [], {}, { $ne: null }]) {
      assert.equal(loginError({ email: "ana@dominio.cl", password }), MESSAGES.passwordType);
    }
  });

  test("correo ausente con contraseña de otro tipo: falta el correo (orden de revisión)", () => {
    assert.equal(loginError({ password: { $ne: null } }), MESSAGES.emailMissing);
  });
});

describe("formato de los mensajes (RNF-7)", () => {
  test("cada mensaje empieza en minúscula y no termina en punto", () => {
    for (const [key, message] of Object.entries(MESSAGES)) {
      assert.match(message, /^\p{Ll}/u, key);
      assert.ok(!message.endsWith("."), key);
      assert.equal(message, message.trim(), key);
    }
  });

  test("textos literales de la spec", () => {
    assert.deepEqual(MESSAGES, {
      emailType: "el correo debe ser un texto",
      usernameType: "el nombre de usuario debe ser un texto",
      passwordType: "la contraseña debe ser un texto",
      displayNameType: "el nombre visible debe ser un texto",
      emailMissing: "falta el correo",
      usernameMissing: "falta el nombre de usuario",
      passwordMissing: "falta la contraseña",
      emailTooLong: "el correo no puede superar 254 caracteres",
      emailFormat: "el correo no tiene un formato válido",
      usernameLength: "el nombre de usuario debe tener entre 3 y 24 caracteres",
      usernameChars: "el nombre de usuario solo admite letras, dígitos, punto, guion y guion bajo",
      passwordTooShort: "la contraseña debe tener al menos 8 caracteres",
      passwordTooLong: "la contraseña no puede superar 72 bytes",
      displayNameTooLong: "el nombre visible no puede superar 40 caracteres",
      emailTaken: "ya existe una cuenta con ese correo",
      usernameTaken: "ese nombre de usuario ya está en uso",
      badCredentials: "correo o contraseña incorrectos",
    });
  });
});
