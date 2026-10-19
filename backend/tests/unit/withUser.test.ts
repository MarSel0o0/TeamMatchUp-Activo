// Paso 5 de `createWithUser`: usuario inexistente (spec 002, RF-22; spec 004, RF-44, DP-37).
// La credencial de un usuario eliminado responde siempre 401 «token inválido»: el mensaje
// no es configurable (las variantes con mensaje propio se retiraron en la T24 de la 004).
// Sin base: `User.exists` simulado.
import { after, afterEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import cookieParser from "cookie-parser";
import express from "express";
import type { RequestHandler } from "express";
import type { Server } from "node:http";
import mongoose from "mongoose";
import supertest from "supertest";
import { User } from "../../src/models/user.ts";
import { CSRF_HEADER, SESSION_COOKIE, signSessionToken } from "../../src/services/sessionToken.ts";
import { createWithUser } from "../../src/utils/middleware.ts";
import { closeTestServers, listenOnLoopback } from "../controllers/helpers.ts";

const SECRET = "secreto-de-prueba-para-withUser";
const NOW_SECONDS = 1_800_000_000;
const now = (): number => NOW_SECONDS;
const USER_ID = new mongoose.Types.ObjectId().toHexString();
const CSRF = "comprobante-de-prueba";

function appWith(guard: RequestHandler): Promise<Server> {
  const app = express();
  app.use(cookieParser());
  app.get("/protegida", guard, (request, response) => {
    response.json({ userId: request.userId });
  });
  return listenOnLoopback(app);
}

function sessionRequest(app: Server) {
  const token = signSessionToken({ id: USER_ID, username: "Ana", csrf: CSRF }, SECRET, NOW_SECONDS);
  return supertest(app).get("/protegida").set("Cookie", `${SESSION_COOKIE}=${token}`).set(CSRF_HEADER, CSRF);
}

function userExists(exists: boolean): void {
  mock.method(User, "exists", async () => (exists ? { _id: new mongoose.Types.ObjectId(USER_ID) } : null));
}

after(() => closeTestServers());

afterEach(() => {
  mock.restoreAll();
});

describe("createWithUser: usuario inexistente (spec 002, RF-22)", () => {
  test("por defecto responde 401 «token inválido»", async () => {
    userExists(false);
    const response = await sessionRequest(await appWith(createWithUser({ jwtSecret: SECRET, now })));
    assert.strictEqual(response.status, 401);
    assert.deepStrictEqual(response.body, { error: "token inválido" });
  });

  test("el mensaje del paso 5 no es configurable: una opción de mensaje ajena se ignora", async () => {
    userExists(false);
    // Objeto intermedio: la comprobación de propiedades sobrantes solo afecta a literales.
    const options = { jwtSecret: SECRET, now, mensaje: "sesión no iniciada" };
    const response = await sessionRequest(await appWith(createWithUser(options)));
    assert.strictEqual(response.status, 401);
    assert.deepStrictEqual(response.body, { error: "token inválido" });
  });

  test("con el usuario existente deja pasar con request.userId", async () => {
    userExists(true);
    const response = await sessionRequest(await appWith(createWithUser({ jwtSecret: SECRET, now })));
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(response.body, { userId: USER_ID });
  });
});

describe("createWithUser: pasos 1 a 4 de la sesión (spec 002, RF-24)", () => {
  test("sin cookie «sesión no iniciada», sin comprobante «token inválido», expirada «sesión expirada»", async () => {
    userExists(true);
    const app = await appWith(createWithUser({ jwtSecret: SECRET, now }));
    const withoutCookie = await supertest(app).get("/protegida").set(CSRF_HEADER, CSRF);
    assert.strictEqual(withoutCookie.status, 401);
    assert.deepStrictEqual(withoutCookie.body, { error: "sesión no iniciada" });

    const token = signSessionToken({ id: USER_ID, username: "Ana", csrf: CSRF }, SECRET, NOW_SECONDS);
    const withoutCsrf = await supertest(app).get("/protegida").set("Cookie", `${SESSION_COOKIE}=${token}`);
    assert.strictEqual(withoutCsrf.status, 401);
    assert.deepStrictEqual(withoutCsrf.body, { error: "token inválido" });

    const old = signSessionToken({ id: USER_ID, username: "Ana", csrf: CSRF }, SECRET, NOW_SECONDS - 7200);
    const expired = await supertest(app)
      .get("/protegida")
      .set("Cookie", `${SESSION_COOKIE}=${old}`)
      .set(CSRF_HEADER, CSRF);
    assert.strictEqual(expired.status, 401);
    assert.deepStrictEqual(expired.body, { error: "sesión expirada" });
  });

  test("no consulta la base si la credencial falla antes", async () => {
    const exists = mock.method(User, "exists", async () => null);
    const app = await appWith(createWithUser({ jwtSecret: SECRET, now }));
    await supertest(app).get("/protegida");
    assert.strictEqual(exists.mock.callCount(), 0);
  });
});
