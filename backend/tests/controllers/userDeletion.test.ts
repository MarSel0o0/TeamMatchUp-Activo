// Eliminar la propia cuenta: `DELETE /api/users/:id` (spec 003, plan §3.5, §3.8 y §6.2).
// RF-10, RF-11, RF-22.
// - Cada eliminación se comprueba en la respuesta, en la cookie (`Set-Cookie` que la expira
//   con los atributos de emisión) y en la base (documento crudo del driver).
// - Escrituras en curso (RF-22, D6): `t.mock.method` sobre `User.findOneAndUpdate` o
//   `User.deleteOne` ejecuta el borrado real (con el driver, sin pasar por el mock) antes o
//   después de delegar en el método original. Una prueba por escritura.
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import type { Response } from "supertest";
import type { Express } from "express";
import { User } from "../../src/models/user.ts";
import { connectDatabase } from "../../src/server.ts";
import { SESSION_COOKIE, SESSION_MESSAGES } from "../../src/services/sessionToken.ts";
import { USER_TARGET_MESSAGES } from "../../src/services/userTarget.ts";
import { testConfig } from "../server/helpers.ts";
import {
  authApp,
  nonExistingId,
  parseSetCookie,
  rawCookieRequest,
  registerUser,
  sessionSetCookie,
  signUp,
  withSession,
} from "./helpers.ts";
import type { HttpMethod, ParsedSetCookie, RegistrationData, SignedUp } from "./helpers.ts";

const app = authApp();

const ANA = { email: "ana@example.com", username: "Ana" } as const;
const BETO = { email: "beto@example.com", username: "Beto" } as const;
const BLOCKS = ["2-20", "4-21"] as const;
const EPOCH = new Date(0).toUTCString(); // "Thu, 01 Jan 1970 00:00:00 GMT"

before(async () => {
  await connectDatabase(testConfig().db);
  await User.init();
});

beforeEach(async () => {
  await User.deleteMany({});
});

after(() => mongoose.disconnect());

function assertStatusError(response: Response, status: number, message: string): void {
  assert.strictEqual(response.status, status);
  assert.match(response.headers["content-type"] ?? "", /application\/json/);
  assert.deepStrictEqual(response.body, { error: message });
}

// Atributos con que se emitió la cookie en el inicio de sesión.
function issuedAttributes(session: SignedUp): Map<string, string> {
  const header = sessionSetCookie(session.response);
  assert.ok(header !== undefined, "el inicio de sesión debería emitir la cookie");
  return parseSetCookie(header).attributes;
}

// RF-11: 204 sin cuerpo y `Set-Cookie` que expira la cookie con los atributos de emisión.
function assertDeleted(response: Response, session: SignedUp): ParsedSetCookie {
  assert.strictEqual(response.status, 204);
  assert.strictEqual(response.text, "");
  assert.strictEqual(response.headers["content-type"], undefined);
  const header = sessionSetCookie(response);
  assert.ok(header !== undefined, "se esperaba el borrado de la cookie");
  const cleared = parseSetCookie(header);
  assert.strictEqual(cleared.name, SESSION_COOKIE);
  assert.strictEqual(cleared.value, "");
  assert.strictEqual(cleared.attributes.get("expires"), EPOCH);
  const withoutExpires = new Map(cleared.attributes);
  withoutExpires.delete("expires");
  assert.deepStrictEqual(withoutExpires, issuedAttributes(session));
  return cleared;
}

// Documentos con ese `_id`, contados con el driver (sin Mongoose).
function countById(id: string): Promise<number> {
  return User.collection.countDocuments({ _id: new mongoose.Types.ObjectId(id) });
}

async function assertGone(id: string): Promise<void> {
  assert.strictEqual(await countById(id), 0, "el usuario no debería estar en la base");
  // La disponibilidad vive dentro del documento (D1): tampoco queda en ningún otro.
  assert.strictEqual(await User.collection.countDocuments({ availability: { $in: [...BLOCKS] } }), 0);
}

async function assertStillThere(id: string): Promise<void> {
  assert.strictEqual(await countById(id), 1, "el usuario debería seguir en la base");
}

function remove(session: SignedUp, segment: string) {
  return withSession(session.agent.delete(`/api/users/${segment}`), session.csrf);
}

// Usuario registrado, con sesión y con disponibilidad guardada.
async function signUpWithBlocks(application: Express, data: RegistrationData = ANA): Promise<SignedUp> {
  const session = await signUp(application, data);
  const response = await withSession(session.agent.put("/api/users/me/availability"), session.csrf).send({
    blocks: [...BLOCKS],
  });
  assert.strictEqual(response.status, 200);
  return session;
}

// Borrado real con el driver: no pasa por `User.deleteOne` (que puede estar simulado).
async function deleteDirectly(id: string): Promise<void> {
  await User.collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
}

interface Operation {
  method: HttpMethod;
  path: (id: string) => string;
  body?: object;
}

// Las 6 operaciones de la spec 003, con cuerpos válidos.
const OPERATIONS: readonly Operation[] = [
  { method: "get", path: () => "/api/users" },
  { method: "get", path: (id) => `/api/users/${id}` },
  { method: "patch", path: (id) => `/api/users/${id}`, body: { displayName: "Ana Nueva" } },
  { method: "delete", path: (id) => `/api/users/${id}` },
  { method: "get", path: (id) => `/api/users/${id}/availability` },
  { method: "put", path: (id) => `/api/users/${id}/availability`, body: { blocks: ["1-10"] } },
];

describe("RF-11: eliminar la propia cuenta", () => {
  test("DELETE /api/users/me → 204 sin cuerpo, cookie borrada y usuario con disponibilidad fuera", async () => {
    const ana = await signUpWithBlocks(app);
    const cleared = assertDeleted(await remove(ana, "me"), ana);
    assert.ok(!cleared.attributes.has("secure"), "sin Secure fuera de producción");
    await assertGone(ana.id);
  });

  test("en producción el borrado de la cookie incluye Secure, igual que la emisión", async () => {
    const production = authApp({ nodeEnv: "production" });
    const ana = await signUp(production, ANA);
    assert.strictEqual(issuedAttributes(ana).get("secure"), "");
    // El agente no reenvía cookies Secure por HTTP: se usa la credencial copiada.
    const response = await rawCookieRequest(production, "delete", "/api/users/me", ana.cookie, ana.csrf);
    const cleared = assertDeleted(response, ana);
    assert.strictEqual(cleared.attributes.get("secure"), "");
    await assertGone(ana.id);
  });

  for (const segment of ["me", "m%65", "upper"]) {
    test(`el propio identificador como «${segment}» → 204`, async () => {
      const ana = await signUpWithBlocks(app);
      const target = segment === "upper" ? ana.id.toUpperCase() : segment;
      assertDeleted(await remove(ana, target), ana);
      await assertGone(ana.id);
    });
  }

  test("con el propio identificador en minúsculas → 204", async () => {
    const ana = await signUpWithBlocks(app);
    assertDeleted(await remove(ana, ana.id), ana);
    await assertGone(ana.id);
  });

  test("no borra a los demás usuarios", async () => {
    const ana = await signUpWithBlocks(app);
    const beto = await signUp(app, BETO);
    assertDeleted(await remove(ana, "me"), ana);
    await assertStillThere(beto.id);
  });

  test("después, la consulta de sesión con el mismo agente → 401 sesión no iniciada", async () => {
    const ana = await signUp(app, ANA);
    assertDeleted(await remove(ana, "me"), ana);
    const response = await withSession(ana.agent.get("/api/auth/me"), ana.csrf);
    assertStatusError(response, 401, SESSION_MESSAGES.notLoggedIn);
  });

  test("después, la credencial copiada → 401 token inválido en la consulta de sesión", async () => {
    const ana = await signUp(app, ANA);
    assertDeleted(await remove(ana, "me"), ana);
    const response = await rawCookieRequest(app, "get", "/api/auth/me", ana.cookie, ana.csrf);
    assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
  });

  for (const operation of OPERATIONS) {
    const label = `${operation.method.toUpperCase()} ${operation.path(":id")}`;
    test(`después, la credencial copiada → 401 token inválido en ${label}`, async () => {
      const ana = await signUpWithBlocks(app);
      assertDeleted(await remove(ana, "me"), ana);
      for (const segment of ["me", ana.id]) {
        const request = rawCookieRequest(app, operation.method, operation.path(segment), ana.cookie, ana.csrf);
        const response = await (operation.body === undefined ? request : request.send(operation.body));
        assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
      }
      await assertGone(ana.id);
    });
  }

  test("después, el mismo correo y el mismo nombre de usuario pueden volver a registrarse", async () => {
    const ana = await signUp(app, ANA);
    assertDeleted(await remove(ana, "me"), ana);
    const again = await registerUser(app, { ...ANA });
    assert.strictEqual(again.status, 201);
    assert.notStrictEqual(Reflect.get(again.body as object, "id"), ana.id);
    // Con otra capitalización del nombre también (la clave es la misma).
    await User.deleteMany({});
    const ana2 = await signUp(app, ANA);
    assertDeleted(await remove(ana2, "me"), ana2);
    assert.strictEqual((await registerUser(app, { email: ANA.email, username: "ANA" })).status, 201);
  });
});

describe("RF-10: eliminar a otro usuario", () => {
  test("otro usuario existente → 403 y sigue en la base, sin borrar la cookie", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUpWithBlocks(app, BETO);
    const response = await remove(ana, beto.id);
    assertStatusError(response, 403, USER_TARGET_MESSAGES.forbidden);
    assert.strictEqual(sessionSetCookie(response), undefined);
    await assertStillThere(beto.id);
    await assertStillThere(ana.id);
    const stored = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(beto.id) });
    assert.deepStrictEqual(stored?.["availability"], [...BLOCKS]);
  });

  test("otro usuario con el identificador en mayúsculas → 403", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    assertStatusError(await remove(ana, beto.id.toUpperCase()), 403, USER_TARGET_MESSAGES.forbidden);
    await assertStillThere(beto.id);
  });

  test("identificador válido inexistente → 403 sin borrar nada", async () => {
    const ana = await signUp(app, ANA);
    const beto = await signUp(app, BETO);
    const response = await remove(ana, nonExistingId());
    assertStatusError(response, 403, USER_TARGET_MESSAGES.forbidden);
    assert.strictEqual(sessionSetCookie(response), undefined);
    assert.strictEqual(await User.collection.countDocuments({}), 2);
    await assertStillThere(ana.id);
    await assertStillThere(beto.id);
  });

  test("identificador con formato inválido → 400 sin borrar nada", async () => {
    const ana = await signUp(app, ANA);
    for (const segment of ["abc", "Me", "%20me"]) {
      assertStatusError(await remove(ana, segment), 400, USER_TARGET_MESSAGES.invalidId);
    }
    await assertStillThere(ana.id);
  });
});

describe("RF-22: escrituras después de eliminar la cuenta", () => {
  test("PATCH, PUT de disponibilidad y DELETE con la credencial copiada → 401, sin recrear", async () => {
    const ana = await signUpWithBlocks(app);
    assertDeleted(await remove(ana, "me"), ana);
    const writes = [
      rawCookieRequest(app, "patch", "/api/users/me", ana.cookie, ana.csrf).send({ displayName: "Ana Nueva" }),
      rawCookieRequest(app, "put", "/api/users/me/availability", ana.cookie, ana.csrf).send({ blocks: [...BLOCKS] }),
      rawCookieRequest(app, "delete", "/api/users/me", ana.cookie, ana.csrf),
    ];
    for (const write of writes) {
      const response = await write;
      assertStatusError(response, 401, SESSION_MESSAGES.invalidToken);
    }
    await assertGone(ana.id);
    assert.strictEqual(await User.collection.countDocuments({}), 0);
  });
});

describe("RF-22: escrituras en curso cuando se elimina la cuenta (D6)", () => {
  test("PATCH del perfil en curso: borrado antes de aplicar → 404 sin efecto", async (t) => {
    const ana = await signUpWithBlocks(app);
    const original = User.findOneAndUpdate;
    const findOneAndUpdate = t.mock.method(User, "findOneAndUpdate", async (...args: unknown[]) => {
      await deleteDirectly(ana.id);
      const result: unknown = Reflect.apply(original, User, args);
      return result;
    });
    const response = await withSession(ana.agent.patch("/api/users/me"), ana.csrf).send({ displayName: "Ana Nueva" });
    assertStatusError(response, 404, USER_TARGET_MESSAGES.userNotFound);
    assert.strictEqual(findOneAndUpdate.mock.callCount(), 1);
    await assertGone(ana.id);
    assert.strictEqual(await User.collection.countDocuments({}), 0);
  });

  test("PUT de la disponibilidad en curso: borrado antes de aplicar → 404 sin efecto", async (t) => {
    const ana = await signUpWithBlocks(app);
    const original = User.findOneAndUpdate;
    const findOneAndUpdate = t.mock.method(User, "findOneAndUpdate", async (...args: unknown[]) => {
      await deleteDirectly(ana.id);
      const result: unknown = Reflect.apply(original, User, args);
      return result;
    });
    const response = await withSession(ana.agent.put("/api/users/me/availability"), ana.csrf).send({
      blocks: ["1-10"],
    });
    assertStatusError(response, 404, USER_TARGET_MESSAGES.userNotFound);
    assert.strictEqual(findOneAndUpdate.mock.callCount(), 1);
    await assertGone(ana.id);
    assert.strictEqual(await User.collection.countDocuments({ availability: "1-10" }), 0);
    assert.strictEqual(await User.collection.countDocuments({}), 0);
  });

  test("PATCH y PUT aplicados antes del borrado → 200 con lo escrito; después no queda nada", async (t) => {
    const ana = await signUpWithBlocks(app);
    const original = User.findOneAndUpdate;
    t.mock.method(User, "findOneAndUpdate", async (...args: unknown[]) => {
      const written: unknown = await Reflect.apply(original, User, args);
      await deleteDirectly(ana.id);
      return written;
    });

    const patched = await withSession(ana.agent.patch("/api/users/me"), ana.csrf).send({ displayName: "Ana Nueva" });
    assert.strictEqual(patched.status, 200);
    assert.strictEqual(Reflect.get(patched.body as object, "displayName"), "Ana Nueva");
    await assertGone(ana.id);

    const beto = await signUpWithBlocks(app, BETO);
    t.mock.restoreAll();
    t.mock.method(User, "findOneAndUpdate", async (...args: unknown[]) => {
      const written: unknown = await Reflect.apply(original, User, args);
      await deleteDirectly(beto.id);
      return written;
    });
    const put = await withSession(beto.agent.put("/api/users/me/availability"), beto.csrf).send({
      blocks: ["1-10"],
    });
    assert.strictEqual(put.status, 200);
    assert.deepStrictEqual(put.body, ["1-10"]);
    await assertGone(beto.id);
    assert.strictEqual(await User.collection.countDocuments({}), 0);
  });

  test("segunda eliminación en curso → 204 y cookie borrada, nunca 500", async (t) => {
    const ana = await signUpWithBlocks(app);
    const original = User.deleteOne;
    const deleteOne = t.mock.method(User, "deleteOne", async (...args: unknown[]) => {
      await deleteDirectly(ana.id); // la primera eliminación termina antes
      const result: unknown = await Reflect.apply(original, User, args); // deletedCount 0
      assert.strictEqual(Reflect.get(result as object, "deletedCount"), 0);
      return result;
    });
    const response = await remove(ana, "me");
    assertDeleted(response, ana);
    assert.strictEqual(deleteOne.mock.callCount(), 1);
    await assertGone(ana.id);
    assert.strictEqual(await User.collection.countDocuments({}), 0);
  });
});
