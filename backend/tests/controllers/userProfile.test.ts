// Actualizar el perfil: `PATCH /api/users/:id` (spec 003, plan §3.4 y §6.2). RF-7, RF-8,
// RF-9, RF-10, RF-15, RF-16, RF-17, RF-18, RF-19, RF-21, RNF-1, RNF-3.
// Cada escritura se comprueba en la respuesta y en la base (documento crudo del driver).
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { PROFILE_MESSAGES } from "../../src/services/profile.ts";
import { USER_TARGET_MESSAGES } from "../../src/services/userTarget.ts";
import { testConfig } from "../server/helpers.ts";
import { HEX24_LOWER, ISO_MS_Z, authApp, closeTestServers, nonExistingId, signUp, withSession } from "./helpers.ts";
import type { SignedUp } from "./helpers.ts";

const app = await authApp();

const PUBLIC_KEYS = ["avatarColor", "bio", "createdAt", "displayName", "id", "timezone", "username"];
const OWN_KEYS = [...PUBLIC_KEYS, "email"].sort();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(async () => {
  await closeTestServers();
  await mongoose.disconnect();
});

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

function fieldOf(value: unknown, key: string): unknown {
  assert.ok(typeof value === "object" && value !== null, "se esperaba un objeto");
  return Reflect.get(value, key);
}

// Documento tal como está en la base, sin pasar por Mongoose.
async function stored(id: string): Promise<Record<string, unknown> | null> {
  return User.collection.findOne({ _id: new mongoose.Types.ObjectId(id) });
}

async function storedOrFail(id: string): Promise<Record<string, unknown>> {
  const document = await stored(id);
  assert.ok(document !== null, "el usuario debería seguir en la base");
  return document;
}

// Datos propios según la consulta de sesión de la spec 002.
async function ownData(session: SignedUp): Promise<unknown> {
  const response = await withSession(session.agent.get("/api/auth/me"), session.csrf);
  assert.strictEqual(response.status, 200);
  return response.body;
}

function patch(session: SignedUp, segment: string, body?: unknown) {
  const request = withSession(session.agent.patch(`/api/users/${segment}`), session.csrf);
  return body === undefined ? request : request.send(body as object);
}

// 200 con exactamente los datos propios (RF-7, RNF-2) y coincidentes con la sesión actual.
async function assertOwnResponse(response: Response, session: SignedUp): Promise<void> {
  assert.strictEqual(response.status, 200);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  const body: unknown = response.body;
  assert.ok(typeof body === "object" && body !== null);
  assert.deepStrictEqual(Object.keys(body).sort(), OWN_KEYS);
  const id = fieldOf(body, "id");
  const createdAt = fieldOf(body, "createdAt");
  assert.ok(typeof id === "string" && HEX24_LOWER.test(id));
  assert.ok(typeof createdAt === "string" && ISO_MS_Z.test(createdAt));
  assert.strictEqual(id, session.id);
  assert.strictEqual(fieldOf(body, "email"), session.email);
  assert.deepStrictEqual(body, await ownData(session));
}

describe("RF-7: modifica solo los campos enviados", () => {
  const SINGLE: readonly (readonly [string, string])[] = [
    ["displayName", "Ana María"],
    ["bio", "jungla y soporte"],
    ["timezone", "Europe/Oslo"],
    ["avatarColor", "#123abc"],
  ];
  for (const [field, value] of SINGLE) {
    test(`solo ${field} → 200, cambia ese campo y conserva el resto en la base`, async () => {
      const ana = await signUp(app, ANA);
      const before = await storedOrFail(ana.id);
      const response = await patch(ana, "me", { [field]: value });
      await assertOwnResponse(response, ana);
      assert.strictEqual(fieldOf(response.body, field), value);
      const afterDoc = await storedOrFail(ana.id);
      assert.deepStrictEqual(afterDoc, { ...before, [field]: value });
    });
  }

  test("los 4 campos a la vez → 200 y los 4 guardados", async () => {
    const ana = await signUp(app, ANA);
    const before = await storedOrFail(ana.id);
    const update = { displayName: "Ana", bio: "hola", timezone: "UTC", avatarColor: "#00ff00" };
    const response = await patch(ana, "me", update);
    await assertOwnResponse(response, ana);
    for (const [key, value] of Object.entries(update)) assert.strictEqual(fieldOf(response.body, key), value);
    assert.deepStrictEqual(await storedOrFail(ana.id), { ...before, ...update });
  });

  test("dos actualizaciones seguidas acumulan los cambios", async () => {
    const ana = await signUp(app, ANA);
    assert.strictEqual((await patch(ana, "me", { bio: "uno" })).status, 200);
    assert.strictEqual((await patch(ana, "me", { timezone: "Asia/Kuala_Lumpur" })).status, 200);
    const document = await storedOrFail(ana.id);
    assert.strictEqual(document["bio"], "uno");
    assert.strictEqual(document["timezone"], "Asia/Kuala_Lumpur");
  });

  interface NoFieldsCase {
    label: string;
    send: (session: SignedUp) => ReturnType<typeof patch>;
  }
  const NO_FIELDS: readonly NoFieldsCase[] = [
    { label: "sin cuerpo ni tipo de contenido", send: (s) => patch(s, "me") },
    {
      label: "JSON con cuerpo vacío",
      send: (s) => patch(s, "me").set("Content-Type", "application/json").send(""),
    },
    {
      label: "text/plain",
      send: (s) => patch(s, "me").set("Content-Type", "text/plain").send('{"displayName":"Otro"}'),
    },
    { label: "{}", send: (s) => patch(s, "me", {}) },
    { label: "lista JSON", send: (s) => patch(s, "me", [{ displayName: "Otro" }]) },
    {
      label: "solo campos ignorados",
      send: (s) => patch(s, "me", { email: "otro@example.com", username: "Otro", extra: 1 }),
    },
  ];
  for (const { label, send } of NO_FIELDS) {
    test(`${label} → 200 con los datos propios actuales y sin cambios`, async () => {
      const ana = await signUp(app, ANA);
      const before = await storedOrFail(ana.id);
      const expected = await ownData(ana);
      const response = await send(ana);
      await assertOwnResponse(response, ana);
      assert.deepStrictEqual(response.body, expected);
      assert.deepStrictEqual(await storedOrFail(ana.id), before);
    });
  }
});

describe("RF-9 y RNF-1: el resto del cuerpo se ignora y la escritura es sobre la sesión", () => {
  test("id, correo, nombre de usuario, contraseña, hash, fecha y disponibilidad no cambian", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const anaBefore = await storedOrFail(ana.id);
    const betoBefore = await storedOrFail(beto.id);
    const response = await patch(ana, "me", {
      displayName: "Nueva",
      id: beto.id,
      _id: beto.id,
      email: "cambiado@example.com",
      username: "Cambiado",
      usernameKey: "cambiado",
      password: "otra-contraseña-segura",
      passwordHash: "hash-falso",
      createdAt: "2000-01-01T00:00:00.000Z",
      availability: ["2-20"],
    });
    await assertOwnResponse(response, ana);
    assert.strictEqual(fieldOf(response.body, "id"), ana.id);
    assert.deepStrictEqual(await storedOrFail(ana.id), { ...anaBefore, displayName: "Nueva" });
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
    assert.strictEqual(await User.collection.countDocuments(), 2);
  });

  test("la contraseña sigue siendo la anterior", async () => {
    const ana = await signUp(app, ANA);
    await patch(ana, "me", { password: "otra-contraseña-segura", displayName: "Nueva" });
    const login = await ana.agent.post("/api/auth/login").send({ email: ana.email, password: "contraseña-segura" });
    assert.strictEqual(login.status, 200);
  });
});

// Valores no textuales de RF-17 (incluido `null`).
const NON_TEXT: readonly (readonly [string, unknown])[] = [
  ["null", null],
  ["número", 5],
  ["booleano", true],
  ["lista", ["Ana"]],
  ["objeto", { valor: "Ana" }],
];

const TYPE_MESSAGES = {
  displayName: PROFILE_MESSAGES.displayNameType,
  bio: PROFILE_MESSAGES.bioType,
  timezone: PROFILE_MESSAGES.timezoneType,
  avatarColor: PROFILE_MESSAGES.avatarColorType,
} as const;

// Cuerpos inválidos con su mensaje: RF-8, RF-15, RF-16, RF-17 y el orden de RF-19.
const INVALID: readonly (readonly [string, Record<string, unknown>, string])[] = [
  ...Object.entries(TYPE_MESSAGES).flatMap(([field, message]) =>
    NON_TEXT.map(([kind, value]) => [`${field} ${kind}`, { [field]: value }, message] as const),
  ),
  ["nombre vacío", { displayName: "" }, PROFILE_MESSAGES.displayNameEmpty],
  ["nombre solo de espacios", { displayName: "   " }, PROFILE_MESSAGES.displayNameEmpty],
  ["nombre de 41", { displayName: "a".repeat(41) }, PROFILE_MESSAGES.displayNameTooLong],
  ["nombre de 21 emojis", { displayName: "😀".repeat(21) }, PROFILE_MESSAGES.displayNameTooLong],
  ["biografía de 201", { bio: "b".repeat(201) }, PROFILE_MESSAGES.bioTooLong],
  ["zona vacía", { timezone: "" }, PROFILE_MESSAGES.timezoneInvalid],
  ["zona solo de espacios", { timezone: "   " }, PROFILE_MESSAGES.timezoneInvalid],
  ["zona con espacio interior", { timezone: "America/ Santiago" }, PROFILE_MESSAGES.timezoneInvalid],
  ["zona con NEL", { timezone: "\u0085UTC" }, PROFILE_MESSAGES.timezoneInvalid],
  ["color #abc", { avatarColor: "#abc" }, PROFILE_MESSAGES.avatarColorFormat],
  ["color sin #", { avatarColor: "abcdef" }, PROFILE_MESSAGES.avatarColorFormat],
  ["color vacío", { avatarColor: "" }, PROFILE_MESSAGES.avatarColorFormat],
  ["color solo de espacios", { avatarColor: "   " }, PROFILE_MESSAGES.avatarColorFormat],
  ["color #abcdeg", { avatarColor: "#abcdeg" }, PROFILE_MESSAGES.avatarColorFormat],
  // RF-19: primer error en el orden nombre, biografía, zona y color.
  ["nombre de 41 y color #abc", { displayName: "a".repeat(41), avatarColor: "#abc" }, PROFILE_MESSAGES.displayNameTooLong],
  ["biografía null y zona inválida", { bio: null, timezone: "GMT" }, PROFILE_MESSAGES.bioType],
  ["zona y color inválidos", { avatarColor: "#abc", timezone: "GMT" }, PROFILE_MESSAGES.timezoneInvalid],
  ["nombre 5 y biografía de 201", { bio: "b".repeat(201), displayName: 5 }, PROFILE_MESSAGES.displayNameType],
  ["color null y nombre vacío", { avatarColor: null, displayName: " " }, PROFILE_MESSAGES.displayNameEmpty],
  // Un campo válido junto a uno inválido: no se guarda ninguno (RF-8, RF-15 a RF-17).
  ["nombre válido y color inválido", { displayName: "Nueva", avatarColor: "#abc" }, PROFILE_MESSAGES.avatarColorFormat],
  ["biografía válida y nombre vacío", { bio: "hola", displayName: "" }, PROFILE_MESSAGES.displayNameEmpty],
];

describe("RF-8, RF-15, RF-16, RF-17, RF-19 y RNF-3: cuerpo inválido → 400 y la base no cambia", () => {
  for (const [label, body, message] of INVALID) {
    test(`${label} → 400 ${message}`, async () => {
      const ana = await signUp(app, ANA);
      const before = await storedOrFail(ana.id);
      const response = await patch(ana, "me", body);
      assertStatusError(response, 400, message);
      assert.deepStrictEqual(await storedOrFail(ana.id), before);
    });
  }
});

describe("RF-16: zonas horarias de los casos límite", () => {
  const VALID = [
    "America/Santiago",
    "UTC",
    "America/Argentina/Buenos_Aires",
    "Europe/Amsterdam",
    "Europe/Oslo",
    "Asia/Kuala_Lumpur",
  ];
  for (const zone of VALID) {
    test(`${zone} → 200 y guardada`, async () => {
      const ana = await signUp(app, ANA);
      await patch(ana, "me", { timezone: "Europe/Oslo" === zone ? "UTC" : "Europe/Oslo" });
      const response = await patch(ana, "me", { timezone: zone });
      await assertOwnResponse(response, ana);
      assert.strictEqual(fieldOf(response.body, "timezone"), zone);
      assert.strictEqual((await storedOrFail(ana.id))["timezone"], zone);
    });
  }

  const INVALID_ZONES = [
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
  ];
  for (const zone of INVALID_ZONES) {
    test(`${zone} → 400 la zona horaria no es válida, sin cambios`, async () => {
      const ana = await signUp(app, ANA);
      const before = await storedOrFail(ana.id);
      const response = await patch(ana, "me", { timezone: zone });
      assertStatusError(response, 400, PROFILE_MESSAGES.timezoneInvalid);
      assert.deepStrictEqual(await storedOrFail(ana.id), before);
    });
  }
});

describe("RF-21: se guarda recortado y el color en minúsculas", () => {
  const CASES: readonly (readonly [string, string, string])[] = [
    ["displayName", "  Ana María  ", "Ana María"],
    ["displayName", ` ${"a".repeat(40)} `, "a".repeat(40)],
    ["displayName", "😀".repeat(20), "😀".repeat(20)],
    ["bio", "  hola  ", "hola"],
    ["bio", ` ${"b".repeat(200)}\n`, "b".repeat(200)],
    ["timezone", " America/Santiago ", "America/Santiago"],
    ["timezone", "America/Santiago\n", "America/Santiago"],
    ["timezone", " Europe/Oslo﻿", "Europe/Oslo"],
    ["avatarColor", "#ABCDEF", "#abcdef"],
    ["avatarColor", " #AbCdEf ", "#abcdef"],
    ["avatarColor", "#abcdef\t", "#abcdef"],
    ["avatarColor", "﻿#A1B2C3 ", "#a1b2c3"],
  ];
  for (const [field, sent, saved] of CASES) {
    test(`${field} ${JSON.stringify(sent)} → se guarda ${JSON.stringify(saved)}`, async () => {
      const ana = await signUp(app, ANA);
      const response = await patch(ana, "me", { [field]: sent });
      await assertOwnResponse(response, ana);
      assert.strictEqual(fieldOf(response.body, field), saved);
      assert.strictEqual((await storedOrFail(ana.id))[field], saved);
    });
  }

  for (const bio of ["", "   "]) {
    test(`biografía ${JSON.stringify(bio)} → válida y queda vacía`, async () => {
      const ana = await signUp(app, ANA);
      assert.strictEqual((await patch(ana, "me", { bio: "algo" })).status, 200);
      const response = await patch(ana, "me", { bio });
      await assertOwnResponse(response, ana);
      assert.strictEqual(fieldOf(response.body, "bio"), "");
      assert.strictEqual((await storedOrFail(ana.id))["bio"], "");
    });
  }
});

describe("RF-10 y RF-18: propiedad, formato y orden de revisión", () => {
  test("otro usuario → 403 y ninguno de los dos cambia", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const anaBefore = await storedOrFail(ana.id);
    const betoBefore = await storedOrFail(beto.id);
    const response = await patch(ana, beto.id, { displayName: "Hackeado" });
    assertStatusError(response, 403, USER_TARGET_MESSAGES.forbidden);
    assert.deepStrictEqual(await storedOrFail(ana.id), anaBefore);
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
  });

  test("otro usuario con su id en mayúsculas → 403", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const betoBefore = await storedOrFail(beto.id);
    const response = await patch(ana, beto.id.toUpperCase(), { bio: "x" });
    assertStatusError(response, 403, USER_TARGET_MESSAGES.forbidden);
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
  });

  test("id válido inexistente → 403 (no 404) y no se crea nada", async () => {
    const ana = await signUp(app, ANA);
    const before = await storedOrFail(ana.id);
    const missing = nonExistingId();
    const response = await patch(ana, missing, { displayName: "Nadie" });
    assertStatusError(response, 403, USER_TARGET_MESSAGES.forbidden);
    assert.strictEqual(await stored(missing), null);
    assert.strictEqual(await User.collection.countDocuments(), 1);
    assert.deepStrictEqual(await storedOrFail(ana.id), before);
  });

  test("otro usuario con cuerpo inválido → 403, no 400", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const betoBefore = await storedOrFail(beto.id);
    const response = await patch(ana, beto.id, { displayName: 5, avatarColor: "#abc" });
    assertStatusError(response, 403, USER_TARGET_MESSAGES.forbidden);
    assert.deepStrictEqual(await storedOrFail(beto.id), betoBefore);
  });

  test("id inexistente con cuerpo inválido → 403", async () => {
    const ana = await signUp(app, ANA);
    const response = await patch(ana, nonExistingId(), { displayName: "" });
    assertStatusError(response, 403, USER_TARGET_MESSAGES.forbidden);
  });

  for (const segment of ["aaaaaaaaaaaa", "Me", "ME", "%20me", "%zz", "%E0%A4"]) {
    test(`${segment} con cuerpo inválido → 400 id con formato inválido y sin cambios`, async () => {
      const ana = await signUp(app, ANA);
      const before = await storedOrFail(ana.id);
      const response = await patch(ana, segment, { displayName: 5 });
      assertStatusError(response, 400, USER_TARGET_MESSAGES.invalidId);
      assert.deepStrictEqual(await storedOrFail(ana.id), before);
    });
  }

  const OWN_SEGMENTS: readonly (readonly [string, (session: SignedUp) => string])[] = [
    ["me", () => "me"],
    ["m%65", () => "m%65"],
    ["id propio", (session) => session.id],
    ["id propio en mayúsculas", (session) => session.id.toUpperCase()],
  ];
  for (const [label, segment] of OWN_SEGMENTS) {
    test(`${label} → 200 con los datos propios y el cambio guardado`, async () => {
      const ana = await signUp(app, ANA);
      const response = await patch(ana, segment(ana), { displayName: "Propia" });
      await assertOwnResponse(response, ana);
      assert.strictEqual(fieldOf(response.body, "displayName"), "Propia");
      assert.strictEqual((await storedOrFail(ana.id))["displayName"], "Propia");
    });
  }
});
