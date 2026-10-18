// Registro: `POST /api/users` contra la base de prueba (plan §3.5 y §6.2).
// RF-1..RF-7, RF-16, RF-19, RF-20 (sin cookie ni cabecera), RF-21, RF-26, RNF-4, RNF-5.
import { after, afterEach, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import supertest from "supertest";
import type { Response } from "supertest";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { MESSAGES } from "../../src/services/credentials.ts";
import { testConfig } from "../server/helpers.ts";
import { VALID_REGISTRATION, authApp, registerUser } from "./helpers.ts";

const app = authApp();
const api = supertest(app);

const OWN_KEYS = ["avatarColor", "bio", "createdAt", "displayName", "email", "id", "timezone", "username"];

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
});

beforeEach(async () => {
  await User.deleteMany({});
});

afterEach(() => {
  mock.restoreAll();
});

after(() => mongoose.disconnect());

function assertError(response: Response, message: string): void {
  assert.strictEqual(response.status, 400);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

// Copia completa de la colección, para comprobar que un 400 no cambia nada.
async function snapshot(): Promise<unknown[]> {
  return User.find({}).sort({ _id: 1 }).lean();
}

function sortedStatuses(responses: readonly Response[]): number[] {
  return responses.map((response) => response.status).sort((a, b) => a - b);
}

describe("registro correcto (RF-1, RF-16, RNF-4)", () => {
  test("201 con los datos propios y los valores por defecto", async () => {
    const response = await registerUser(app);
    assert.strictEqual(response.status, 201);
    assert.match(response.headers["content-type"] ?? "", /application\/json/);
    assert.deepStrictEqual(Object.keys(response.body).sort(), OWN_KEYS);
    assert.strictEqual(response.body.email, "ana@example.com");
    assert.strictEqual(response.body.username, "Ana");
    assert.strictEqual(response.body.displayName, "Ana");
    assert.strictEqual(response.body.avatarColor, "#6d5efc");
    assert.strictEqual(response.body.bio, "");
    assert.strictEqual(response.body.timezone, "America/Santiago");
    assert.match(response.body.id, /^[0-9a-f]{24}$/);
    assert.ok(!Number.isNaN(Date.parse(response.body.createdAt)));
    assert.strictEqual(await User.countDocuments(), 1);
  });

  test("RF-16: id, hash, fecha, color, bio y zona del cuerpo se ignoran", async () => {
    const forgedId = new mongoose.Types.ObjectId().toString();
    const response = await registerUser(app, {
      id: forgedId,
      _id: forgedId,
      passwordHash: "$2b$10$falso",
      usernameKey: "otra",
      createdAt: "2000-01-01T00:00:00.000Z",
      avatarColor: "#000000",
      bio: "biografía enviada",
      timezone: "Europe/Madrid",
      admin: true,
    });
    assert.strictEqual(response.status, 201);
    assert.deepStrictEqual(Object.keys(response.body).sort(), OWN_KEYS);
    assert.notStrictEqual(response.body.id, forgedId);
    assert.strictEqual(response.body.avatarColor, "#6d5efc");
    assert.strictEqual(response.body.bio, "");
    assert.strictEqual(response.body.timezone, "America/Santiago");
    assert.notStrictEqual(response.body.createdAt, "2000-01-01T00:00:00.000Z");

    const stored = await User.findOne({}).lean();
    assert.ok(stored);
    assert.strictEqual(stored._id.toString(), response.body.id);
    assert.strictEqual(stored.usernameKey, "ana");
    assert.notStrictEqual(stored.passwordHash, "$2b$10$falso");
    assert.strictEqual(stored.timezone, "America/Santiago");
    assert.ok(!("admin" in stored));
  });

  test("RF-6: nombre visible enviado se guarda recortado", async () => {
    const response = await registerUser(app, { displayName: "  Ana la Grande  " });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.displayName, "Ana la Grande");
  });

  test("RF-6: nombre visible de solo espacios → el nombre de usuario", async () => {
    const response = await registerUser(app, { displayName: "   " });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.displayName, "Ana");
  });

  test("RF-7: el correo se guarda y se devuelve recortado y en minúsculas", async () => {
    const response = await registerUser(app, { email: "  JOSÉ@Dominio.CL " });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.email, "josé@dominio.cl");
    const stored = await User.findOne({}).lean();
    assert.strictEqual(stored?.email, "josé@dominio.cl");
  });

  test("RF-3 / RF-7: el nombre de usuario se guarda recortado y tal como se escribió", async () => {
    const response = await registerUser(app, { username: "  Ana  " });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.username, "Ana");
    const stored = await User.findOne({}).lean();
    assert.strictEqual(stored?.username, "Ana");
    assert.strictEqual(stored?.usernameKey, "ana");
  });
});

describe("contraseña guardada como hash (RF-2, RNF-4, RNF-5)", () => {
  test("el hash es bcrypt de costo 10 y no aparece en la respuesta", async () => {
    const response = await registerUser(app);
    assert.strictEqual(response.status, 201);
    const stored = await User.findOne({}).lean();
    assert.ok(stored);
    assert.notStrictEqual(stored.passwordHash, VALID_REGISTRATION.password);
    assert.match(stored.passwordHash, /^\$2b\$10\$/);
    assert.ok(!("passwordHash" in response.body));
    assert.ok(!("password" in response.body));
    assert.ok(!response.text.includes(stored.passwordHash));
    assert.ok(!response.text.includes(VALID_REGISTRATION.password));
  });

  test("dos usuarios con la misma contraseña tienen hashes distintos (sal)", async () => {
    assert.strictEqual((await registerUser(app)).status, 201);
    assert.strictEqual(
      (await registerUser(app, { email: "beto@example.com", username: "beto" })).status,
      201,
    );
    const hashes = (await User.find({}).lean()).map((user) => user.passwordHash);
    assert.strictEqual(hashes.length, 2);
    assert.notStrictEqual(hashes[0], hashes[1]);
  });
});

describe("repeticiones (RF-3)", () => {
  test("correo repetido, también con mayúsculas y espacios → 400 correo", async () => {
    assert.strictEqual((await registerUser(app)).status, 201);
    const before = await snapshot();
    for (const email of ["ana@example.com", "  ANA@Example.COM  "]) {
      const response = await registerUser(app, { email, username: `otro${email.length}` });
      assertError(response, MESSAGES.emailTaken);
    }
    assert.deepStrictEqual(await snapshot(), before);
  });

  test("\"Ana\" se devuelve como \"Ana\" y después \"ana\" → 400 usuario", async () => {
    const first = await registerUser(app);
    assert.strictEqual(first.status, 201);
    assert.strictEqual(first.body.username, "Ana");
    const before = await snapshot();
    for (const username of ["ana", "ANA", "  aNa  "]) {
      const response = await registerUser(app, { email: `${username.trim()}@otro.com`, username });
      assertError(response, MESSAGES.usernameTaken);
    }
    assert.deepStrictEqual(await snapshot(), before);
  });

  test("correo y nombre de usuario repetidos a la vez → 400 correo", async () => {
    assert.strictEqual((await registerUser(app)).status, 201);
    const before = await snapshot();
    const response = await registerUser(app, { username: "ana" });
    assertError(response, MESSAGES.emailTaken);
    assert.deepStrictEqual(await snapshot(), before);
  });

  test("correo de un usuario y nombre de otro → 400 correo", async () => {
    assert.strictEqual((await registerUser(app)).status, 201);
    assert.strictEqual(
      (await registerUser(app, { email: "beto@example.com", username: "beto" })).status,
      201,
    );
    const response = await registerUser(app, { email: "ana@example.com", username: "Beto" });
    assertError(response, MESSAGES.emailTaken);
    assert.strictEqual(await User.countDocuments(), 2);
  });
});

describe("validación por HTTP (RF-4, RF-5, RF-6, RF-19)", () => {
  const ok = VALID_REGISTRATION;
  const localOf = (length: number) => "a".repeat(length - "@example.com".length);
  const cases: ReadonlyArray<{ name: string; body: Record<string, unknown>; error: string }> = [
    { name: "sin correo", body: { username: ok.username, password: ok.password }, error: MESSAGES.emailMissing },
    { name: "correo de espacios", body: { ...ok, email: "   " }, error: MESSAGES.emailMissing },
    { name: "correo null", body: { ...ok, email: null }, error: MESSAGES.emailMissing },
    { name: "correo de 255", body: { ...ok, email: `${localOf(255)}@example.com` }, error: MESSAGES.emailTooLong },
    { name: "correo sin formato", body: { ...ok, email: "ana@example" }, error: MESSAGES.emailFormat },
    { name: "sin nombre de usuario", body: { email: ok.email, password: ok.password }, error: MESSAGES.usernameMissing },
    { name: "nombre de usuario \"  ab  \"", body: { ...ok, username: "  ab  " }, error: MESSAGES.usernameLength },
    { name: "nombre de usuario de 25", body: { ...ok, username: "a".repeat(25) }, error: MESSAGES.usernameLength },
    { name: "nombre de usuario con espacio", body: { ...ok, username: "ana maria" }, error: MESSAGES.usernameChars },
    { name: "nombre de usuario con ñ", body: { ...ok, username: "ñandú" }, error: MESSAGES.usernameChars },
    { name: "sin contraseña", body: { email: ok.email, username: ok.username }, error: MESSAGES.passwordMissing },
    { name: "contraseña vacía", body: { ...ok, password: "" }, error: MESSAGES.passwordMissing },
    { name: "contraseña de 7", body: { ...ok, password: "1234567" }, error: MESSAGES.passwordTooShort },
    { name: "contraseña de 73 bytes", body: { ...ok, password: "ñ".repeat(36) + "a" }, error: MESSAGES.passwordTooLong },
    { name: "nombre visible de 41", body: { ...ok, displayName: "a".repeat(41) }, error: MESSAGES.displayNameTooLong },
    { name: "correo { $ne: null }", body: { ...ok, email: { $ne: null } }, error: MESSAGES.emailType },
    { name: "correo número", body: { ...ok, email: 42 }, error: MESSAGES.emailType },
    { name: "nombre de usuario arreglo", body: { ...ok, username: ["Ana"] }, error: MESSAGES.usernameType },
    { name: "contraseña booleana", body: { ...ok, password: true }, error: MESSAGES.passwordType },
    { name: "nombre visible objeto", body: { ...ok, displayName: { a: 1 } }, error: MESSAGES.displayNameType },
    {
      name: "varios inválidos → el primero (correo)",
      body: { email: "mal", username: "a", password: "1" },
      error: MESSAGES.emailFormat,
    },
  ];

  for (const { name, body, error } of cases) {
    test(`${name} → 400 "${error}" sin crear usuarios`, async () => {
      const response = await api.post("/api/users").send(body);
      assertError(response, error);
      assert.strictEqual(await User.countDocuments(), 0);
    });
  }

  test("RF-19: { $ne: null } no se usa como filtro aunque exista un usuario", async () => {
    assert.strictEqual((await registerUser(app)).status, 201);
    const before = await snapshot();
    const response = await registerUser(app, { email: { $ne: null }, username: { $ne: null } });
    assertError(response, MESSAGES.emailType);
    assert.deepStrictEqual(await snapshot(), before);
  });

  test("text/plain → 400 \"falta el correo\"", async () => {
    const response = await api
      .post("/api/users")
      .set("Content-Type", "text/plain")
      .send(JSON.stringify(VALID_REGISTRATION));
    assertError(response, MESSAGES.emailMissing);
    assert.strictEqual(await User.countDocuments(), 0);
  });

  test("sin cuerpo → 400 \"falta el correo\"", async () => {
    const response = await api.post("/api/users");
    assertError(response, MESSAGES.emailMissing);
    assert.strictEqual(await User.countDocuments(), 0);
  });

  test("correo de 254 → 201", async () => {
    const email = `${localOf(254)}@example.com`;
    assert.strictEqual(email.length, 254);
    const response = await registerUser(app, { email });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.email, email);
  });

  test("contraseña de 72 bytes (36 \"ñ\") → 201", async () => {
    const response = await registerUser(app, { password: "ñ".repeat(36) });
    assert.strictEqual(response.status, 201);
  });

  test("contraseña de 8 espacios → 201", async () => {
    const response = await registerUser(app, { password: " ".repeat(8) });
    assert.strictEqual(response.status, 201);
  });

  test("nombre visible de 40 tras recortar → 201", async () => {
    const response = await registerUser(app, { displayName: `  ${"a".repeat(40)}  ` });
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.body.displayName, "a".repeat(40));
  });
});

describe("el registro no inicia sesión (RF-20, RF-26)", () => {
  test("sin Set-Cookie ni X-CSRF-Token", async () => {
    const response = await registerUser(app);
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.headers["set-cookie"], undefined);
    assert.strictEqual(response.headers["x-csrf-token"], undefined);
  });

  test("con una cookie de sesión previa no la toca ni emite otra", async () => {
    const response = await api
      .post("/api/users")
      .set("Cookie", "token=credencial-anterior")
      .set("X-CSRF-Token", "comprobante-anterior")
      .send(VALID_REGISTRATION);
    assert.strictEqual(response.status, 201);
    assert.strictEqual(response.headers["set-cookie"], undefined);
    assert.strictEqual(response.headers["x-csrf-token"], undefined);
  });

  test("un 400 tampoco emite cookie ni cabecera", async () => {
    const response = await registerUser(app, { email: "" });
    assertError(response, MESSAGES.emailMissing);
    assert.strictEqual(response.headers["set-cookie"], undefined);
    assert.strictEqual(response.headers["x-csrf-token"], undefined);
  });
});

describe("registros simultáneos (RF-21)", () => {
  test("dos con el mismo correo → 201 y 400 correo, un solo usuario", async () => {
    const responses = await Promise.all([
      registerUser(app, { username: "Ana" }),
      registerUser(app, { username: "Beto" }),
    ]);
    assert.deepStrictEqual(sortedStatuses(responses), [201, 400]);
    const rejected = responses.find((response) => response.status === 400);
    assert.deepStrictEqual(rejected?.body, { error: MESSAGES.emailTaken });
    assert.strictEqual(await User.countDocuments(), 1);
  });

  test("\"Ana\" y \"ana\" a la vez → 201 y 400 usuario, un solo usuario", async () => {
    const responses = await Promise.all([
      registerUser(app, { email: "ana1@example.com", username: "Ana" }),
      registerUser(app, { email: "ana2@example.com", username: "ana" }),
    ]);
    assert.deepStrictEqual(sortedStatuses(responses), [201, 400]);
    const rejected = responses.find((response) => response.status === 400);
    assert.deepStrictEqual(rejected?.body, { error: MESSAGES.usernameTaken });
    assert.strictEqual(await User.countDocuments(), 1);
  });

  test("cinco iguales a la vez → un 201, cuatro 400 correo, ningún 500", async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => registerUser(app)));
    assert.deepStrictEqual(sortedStatuses(responses), [201, 400, 400, 400, 400]);
    for (const response of responses.filter((r) => r.status === 400)) {
      assert.deepStrictEqual(response.body, { error: MESSAGES.emailTaken });
    }
    assert.strictEqual(await User.countDocuments(), 1);
  });

  test("E11000 tras pasar la comprobación previa → 400 con el mensaje de RF-3", async () => {
    assert.strictEqual((await registerUser(app)).status, 201);
    // Simula la carrera: la comprobación previa no ve al usuario (los dos primeros
    // `exists`), la inserción choca con el índice y la consulta repetida sí lo ve.
    const realExists = User.exists.bind(User);
    let calls = 0;
    const exists = mock.method(User, "exists", (filter: Parameters<typeof User.exists>[0]) => {
      calls += 1;
      return calls <= 2 ? realExists({ _id: new mongoose.Types.ObjectId() }) : realExists(filter);
    });
    const create = mock.method(User, "create");
    const response = await registerUser(app, { username: "ana" });
    assertError(response, MESSAGES.emailTaken);
    assert.strictEqual(create.mock.callCount(), 1);
    assert.ok(exists.mock.callCount() >= 3);
    assert.strictEqual(await User.countDocuments(), 1);
  });

  test("un error de la base distinto del E11000 → 500 genérico", async () => {
    mock.method(User, "create", async () => {
      throw new Error("fallo simulado");
    });
    const response = await registerUser(app);
    assert.strictEqual(response.status, 500);
    assert.deepStrictEqual(response.body, { error: "error interno del servidor" });
  });
});
